import {
  assertLogMatches,
  assertLogMatches2,
  assertRevert,
  NULL_ADDRESS,
  timeTravel,
} from '@celo/protocol/lib/test-utils'
import { BigNumber } from 'bignumber.js'
import * as _ from 'lodash'
import { RegistryInstance, StableTokenInstance } from 'types'

const Registry: Truffle.Contract<RegistryInstance> = artifacts.require('Registry')
const StableToken: Truffle.Contract<StableTokenInstance> = artifacts.require('StableToken')

// @ts-ignore
// TODO(mcortesi): Use BN.js
StableToken.numberFormat = 'BigNumber'

contract('StableToken', (accounts: string[]) => {
  let stableToken: StableTokenInstance
  let registry: RegistryInstance
  let initializationTime

  const amountToMint = 10
  const SECONDS_IN_A_WEEK = 60 * 60 * 24 * 7

  beforeEach(async () => {
    registry = await Registry.new()
    stableToken = await StableToken.new()
    await stableToken.initialize(
      'Celo Dollar',
      'cUSD',
      18,
      registry.address,
      1,
      1,
      SECONDS_IN_A_WEEK
    )
    initializationTime = (await web3.eth.getBlock('latest')).timestamp
  })

  describe('#initialize()', () => {
    it('should have set a name', async () => {
      const name: string = await stableToken.name()
      assert.equal(name, 'Celo Dollar')
    })

    it('should have set a symbol', async () => {
      const name: string = await stableToken.symbol()
      assert.equal(name, 'cUSD')
    })

    it('should have set the owner', async () => {
      const owner: string = await stableToken.owner()
      assert.equal(owner, accounts[0])
    })

    it('should have set decimals', async () => {
      const decimals = await stableToken.decimals()
      assert.equal(decimals.toNumber(), 18)
    })

    it('should have set the registry address', async () => {
      const registryAddress: string = await stableToken.registry()
      assert.equal(registryAddress, registry.address)
    })

    it('should have set the inflation rate parameters', async () => {
      const [
        rateNum,
        rateDen,
        factorNum,
        factorDen,
        updatePeriod,
        factorLastUpdated,
      ] = await stableToken.getInflationParameters()
      assert.equal(rateNum.toNumber(), 1)
      assert.equal(rateDen.toNumber(), 1)
      assert.equal(factorNum.toNumber(), 1)
      assert.equal(factorDen.toNumber(), 1)
      assert.equal(updatePeriod.toNumber(), SECONDS_IN_A_WEEK)
      assert.equal(factorLastUpdated.toNumber(), initializationTime)
    })

    it('should not be callable again', async () => {
      await assertRevert(
        stableToken.initialize('Celo Dollar', 'cUSD', 18, registry.address, 1, 1, SECONDS_IN_A_WEEK)
      )
    })
  })

  describe('#setRegistry()', () => {
    const nonOwner: string = accounts[1]
    const anAddress: string = accounts[2]

    it('should allow owner to set registry', async () => {
      await stableToken.setRegistry(anAddress)
      assert.equal(await stableToken.registry(), anAddress)
    })

    it('should not allow other users to set registry', async () => {
      await assertRevert(stableToken.setRegistry(anAddress, { from: nonOwner }))
    })
  })

  describe('#setMinter()', () => {
    const minter = accounts[0]
    it('should allow owner to set minter', async () => {
      await stableToken.setMinter(minter)
      assert.equal(await stableToken.minter(), minter)
    })

    it('should not allow anyone else to set minter', async () => {
      await assertRevert(stableToken.setMinter(minter, { from: accounts[1] }))
    })
  })

  describe('#mint()', () => {
    const minter = accounts[0]
    beforeEach(async () => {
      await stableToken.setMinter(minter)
    })

    it('should allow minter to mint', async () => {
      await stableToken.mint(minter, amountToMint)
      const balance = (await stableToken.balanceOf(minter)).toNumber()
      assert.equal(balance, amountToMint)
      const supply = (await stableToken.totalSupply()).toNumber()
      assert.equal(supply, amountToMint)
    })

    it('should not allow anyone else to mint', async () => {
      await assertRevert(stableToken.mint(minter, amountToMint, { from: accounts[1] }))
    })
  })

  describe('#transferWithComment()', () => {
    const sender = accounts[0]
    const receiver = accounts[1]
    const comment = 'tacos at lunch'

    beforeEach(async () => {
      await stableToken.setMinter(sender)
      await stableToken.mint(sender, amountToMint)
    })

    it('should transfer balance with a comment', async () => {
      const startBalanceFrom = (await stableToken.balanceOf(sender)).toNumber()
      const startBalanceTo = (await stableToken.balanceOf(receiver)).toNumber()
      const res = await stableToken.transferWithComment(receiver, 5, comment)
      const transferEvent = _.find(res.logs, { event: 'Transfer' })
      const transferCommentEvent = _.find(res.logs, { event: 'TransferComment' })
      assert.exists(transferEvent)
      assert.equal(transferCommentEvent.args.comment, comment)
      const endBalanceFrom = await stableToken.balanceOf(sender)
      const endBalanceTo = await stableToken.balanceOf(receiver)
      assert.equal(endBalanceFrom.toNumber(), startBalanceFrom - 5)
      assert.equal(endBalanceTo.toNumber(), startBalanceTo + 5)
    })

    it('should not allow transferring to the null address', async () => {
      await assertRevert(stableToken.transferWithComment(NULL_ADDRESS, 1, comment))
    })

    it('should not allow transferring more than the owner has', async () => {
      const value = (await stableToken.balanceOf(sender)).toNumber() + 1
      await assertRevert(stableToken.transferWithComment(receiver, value, comment))
    })

    describe('when inflation factor is outdated', () => {
      const inflationRateNumerator = 201
      const inflationRateDenominator = 200
      beforeEach(async () => {
        await stableToken.setInflationParameters(
          inflationRateNumerator,
          inflationRateDenominator,
          SECONDS_IN_A_WEEK
        )
        await timeTravel(SECONDS_IN_A_WEEK, web3)
      })

      it('should update factor', async () => {
        await stableToken.transferWithComment(receiver, 5, comment)
        const [
          ,
          ,
          factorNum,
          factorDen,
          updatePeriod,
          lastUpdated,
        ] = await stableToken.getInflationParameters()
        assert.equal(factorNum.toNumber(), inflationRateNumerator)
        assert.equal(factorDen.toNumber(), inflationRateDenominator)
        assert.equal(lastUpdated.toNumber(), initializationTime + updatePeriod.toNumber())
      })

      it('should emit InflationFactorUpdated event', async () => {
        const res = await stableToken.transferWithComment(receiver, 5, comment)
        assertLogMatches2(res.logs[0], {
          event: 'InflationFactorUpdated',
          args: {
            numerator: inflationRateNumerator,
            denominator: inflationRateDenominator,
            lastUpdated: initializationTime + SECONDS_IN_A_WEEK,
          },
        })
      })
    })
  })

  describe('#setInflationParameters()', () => {
    const inflationRateNumerator = 15
    const inflationRateDenominator = 7
    it('should update parameters', async () => {
      const newUpdatePeriod = SECONDS_IN_A_WEEK + 5
      await stableToken.setInflationParameters(
        inflationRateNumerator,
        inflationRateDenominator,
        newUpdatePeriod
      )
      const [
        rateNum,
        rateDen,
        ,
        ,
        updatePeriod,
        lastUpdated,
      ] = await stableToken.getInflationParameters()
      assert.equal(rateNum.toNumber(), inflationRateNumerator)
      assert.equal(rateDen.toNumber(), inflationRateDenominator)
      assert.equal(updatePeriod.toNumber(), newUpdatePeriod)
      assert.equal(lastUpdated.toNumber(), initializationTime)
    })

    it('should emit an InflationParametersUpdated event', async () => {
      const newUpdatePeriod = SECONDS_IN_A_WEEK + 5
      const res = await stableToken.setInflationParameters(
        inflationRateNumerator,
        inflationRateDenominator,
        newUpdatePeriod
      )
      assertLogMatches2(res.logs[0], {
        event: 'InflationParametersUpdated',
        args: {
          numerator: inflationRateNumerator,
          denominator: inflationRateDenominator,
          updatePeriod: newUpdatePeriod,
          lastUpdated: initializationTime,
        },
      })
    })

    it('should reduce inflationRate when applicable', async () => {
      await stableToken.setInflationParameters(1005, 1000, SECONDS_IN_A_WEEK)
      const [rateNum, rateDen, , , , ,] = await stableToken.getInflationParameters()
      assert.equal(rateNum.toNumber(), 201)
      assert.equal(rateDen.toNumber(), 200)
    })

    it('updates inflationFactor when out of date', async () => {
      await stableToken.setInflationParameters(3, 2, SECONDS_IN_A_WEEK)
      await timeTravel(SECONDS_IN_A_WEEK, web3)
      const res = await stableToken.setInflationParameters(1, 1, SECONDS_IN_A_WEEK)
      const [
        rateNum,
        rateDen,
        factorNum,
        factorDen,
        ,
        lastUpdated,
      ] = await stableToken.getInflationParameters()
      assertLogMatches2(res.logs[0], {
        event: 'InflationFactorUpdated',
        args: {
          numerator: factorNum,
          denominator: factorDen,
          lastUpdated,
        },
      })
      assert.equal(rateNum.toNumber(), 1)
      assert.equal(rateDen.toNumber(), 1)
      assert.equal(factorNum.toNumber(), 3)
      assert.equal(factorDen.toNumber(), 2)
      assert.exists(lastUpdated)
    })

    it('should revert when zero numerator is provided', async () => {
      await assertRevert(stableToken.setInflationParameters(0, 2, SECONDS_IN_A_WEEK))
    })

    it('should revert when zero denominator is provided', async () => {
      await assertRevert(stableToken.setInflationParameters(3, 0, SECONDS_IN_A_WEEK))
    })
  })

  describe('#balanceOf()', () => {
    const minter = accounts[0]
    const mintAmount = 1000

    beforeEach(async () => {
      await stableToken.setMinter(minter)
      await stableToken.mint(minter, mintAmount)
    })

    describe('#when there is no inflation', () => {
      it('should fetch unmodified balance', async () => {
        const balance = (await stableToken.balanceOf(minter)).toNumber()
        assert.equal(balance, mintAmount)
        await timeTravel(SECONDS_IN_A_WEEK, web3)
        const adjustedBalance = (await stableToken.balanceOf(minter)).toNumber()
        assert.equal(adjustedBalance, balance)
      })
    })

    describe('#when there is 0.5% weekly inflation', () => {
      beforeEach(async () => {
        await stableToken.setInflationParameters(1005, 1000, SECONDS_IN_A_WEEK)
        await timeTravel(SECONDS_IN_A_WEEK, web3)
      })

      it('should return depreciated balance value', async () => {
        const adjustedBalance = (await stableToken.balanceOf(minter)).toNumber()
        assert.equal(adjustedBalance, 995)
      })
    })
  })

  describe('#valueToUnits()', () => {
    beforeEach(async () => {
      await stableToken.setInflationParameters(1005, 1000, SECONDS_IN_A_WEEK)
      await timeTravel(SECONDS_IN_A_WEEK, web3)
    })

    it('value 995 should correspond to roughly 1000 units after .005 depreciation', async () => {
      await stableToken.setInflationParameters(1000, 1000, SECONDS_IN_A_WEEK)
      const units = (await stableToken.valueToUnits(995)).toNumber()
      assert.equal(units, 999) // roundoff err
    })

    it('value 990 should correspond to roughly 1000 units after .005 depreciation twice', async () => {
      await timeTravel(SECONDS_IN_A_WEEK, web3)
      await stableToken.setInflationParameters(1000, 1000, SECONDS_IN_A_WEEK)
      const units = (await stableToken.valueToUnits(990)).toNumber()
      assert.equal(units, 999) // roundoff err
    })
  })

  describe('#unitsToValue()', () => {
    beforeEach(async () => {
      await stableToken.setInflationParameters(1005, 1000, SECONDS_IN_A_WEEK)
      await timeTravel(SECONDS_IN_A_WEEK, web3)
    })

    it('1000 in units should be 995 in value after .005 depreciation', async () => {
      await stableToken.setInflationParameters(1000, 1000, SECONDS_IN_A_WEEK)
      const value = (await stableToken.unitsToValue(1000)).toNumber()
      assert.equal(value, 995)
    })

    it('1000 in units should be 990 in value after .005 depreciation twice', async () => {
      await timeTravel(SECONDS_IN_A_WEEK, web3)
      await stableToken.setInflationParameters(1000, 1000, SECONDS_IN_A_WEEK)
      const value = (await stableToken.unitsToValue(1000)).toNumber()
      assert.equal(value, 990)
    })
  })

  describe('#fractionMulExp()', () => {
    it('can do generic computations', async () => {
      const [numerator, denominator] = await stableToken.fractionMulExp.call(1, 2, 3, 4, 5, 6)
      assert.equal(numerator.toNumber(), 118652)
      assert.equal(denominator.toNumber(), 1000000)
    })

    it('works with exponent zero', async () => {
      const [numerator, denominator] = await stableToken.fractionMulExp.call(1, 2, 3, 4, 0, 6)
      assert.equal(numerator.toNumber(), 500000)
      assert.equal(denominator.toNumber(), 1000000)
    })

    it('works with precision zero', async () => {
      const [numerator, denominator] = await stableToken.fractionMulExp.call(1, 2, 3, 4, 5, 0)
      assert.equal(numerator.toNumber(), 0)
      assert.equal(denominator.toNumber(), 1)
    })

    it('fails if a zero aDenominator is provided', async () => {
      await assertRevert(stableToken.fractionMulExp(1, 0, 3, 4, 5, 6))
    })

    it('fails if a zero bDenominator is provided', async () => {
      await assertRevert(stableToken.fractionMulExp(1, 2, 3, 0, 5, 6))
    })
  })

  describe('#burn()', () => {
    const minter = accounts[0]
    const amountToBurn = 5
    beforeEach(async () => {
      await stableToken.setMinter(minter)
      await stableToken.mint(minter, amountToMint)
    })

    it('should allow minter to burn', async () => {
      await stableToken.burn(amountToBurn)
      const balance = (await stableToken.balanceOf(minter)).toNumber()
      const expectedBalance = amountToMint - amountToBurn
      assert.equal(balance, expectedBalance)
      const supply = (await stableToken.totalSupply()).toNumber()
      assert.equal(supply, expectedBalance)
    })

    it('should not allow anyone else to burn', async () => {
      await assertRevert(stableToken.burn(amountToBurn, { from: accounts[1] }))
    })
  })

  describe('#updateInflationFactor()', () => {
    describe('modifier should be called and emit an event on', () => {
      const sender = accounts[0]
      const receiver = accounts[1]
      const inflationRateNumerator = 201
      const inflationRateDenominator = 200
      const amount = new BigNumber(10000000000000000000)

      beforeEach(async () => {
        await stableToken.setMinter(sender)
        await stableToken.mint(sender, amount.times(2))
        await stableToken.setInflationParameters(
          inflationRateNumerator,
          inflationRateDenominator,
          SECONDS_IN_A_WEEK
        )
        await timeTravel(SECONDS_IN_A_WEEK, web3)
      })

      async function assertInflationUpdatedEvent(log, requestBlockTime, inflationPeriods = 1) {
        assertLogMatches(log, 'InflationFactorUpdated', {
          numerator: Math.pow(inflationRateNumerator, inflationPeriods),
          denominator: Math.pow(inflationRateDenominator, inflationPeriods),
          lastUpdated: requestBlockTime,
        })
      }

      it('setInflationParameters', async () => {
        const res = await stableToken.setInflationParameters(1, 1, SECONDS_IN_A_WEEK)
        await assertInflationUpdatedEvent(res.logs[0], initializationTime + SECONDS_IN_A_WEEK)
      })

      it('approve', async () => {
        const res = await stableToken.approve(receiver, amount)
        await assertInflationUpdatedEvent(res.logs[0], initializationTime + SECONDS_IN_A_WEEK)
      })

      it('mint', async () => {
        const res = await stableToken.mint(sender, amountToMint)
        await assertInflationUpdatedEvent(res.logs[0], initializationTime + SECONDS_IN_A_WEEK)
      })

      it('transferWithComment', async () => {
        const res = await stableToken.transferWithComment(receiver, amount, 'hi')
        await assertInflationUpdatedEvent(res.logs[0], initializationTime + SECONDS_IN_A_WEEK)
      })

      it('burn', async () => {
        const res = await stableToken.mint(sender, amount)
        await assertInflationUpdatedEvent(res.logs[0], initializationTime + SECONDS_IN_A_WEEK)
      })

      it('transferFrom', async () => {
        await stableToken.approve(receiver, amount)
        await timeTravel(SECONDS_IN_A_WEEK, web3)
        const res = await stableToken.transferFrom(sender, receiver, amount, { from: receiver })
        await assertInflationUpdatedEvent(
          res.logs[0],
          initializationTime + SECONDS_IN_A_WEEK * 2,
          2
        )
      })

      it('transfer', async () => {
        const res = await stableToken.transfer(receiver, 1)
        await assertInflationUpdatedEvent(res.logs[0], initializationTime + SECONDS_IN_A_WEEK)
      })
    })
  })

  describe('#ERC20Functions', () => {
    const sender = accounts[0]
    const receiver = accounts[1]
    const transferAmount = 1

    beforeEach(async () => {
      await stableToken.setMinter(sender)
      await stableToken.mint(sender, amountToMint)
    })

    describe('#balanceOf()', () => {
      it('should match the minted amount', async () => {
        assert.equal((await stableToken.balanceOf(sender)).toNumber(), amountToMint)
      })
    })

    describe('#approve()', () => {
      it('should set "allowed"', async () => {
        await stableToken.approve(receiver, transferAmount)
        assert.equal((await stableToken.allowance(sender, receiver)).toNumber(), transferAmount)
      })
    })

    describe('#allowance()', () => {
      it('should return the allowance', async () => {
        await stableToken.approve(receiver, transferAmount)
        assert.equal((await stableToken.allowance(sender, receiver)).toNumber(), transferAmount)
      })
    })

    const assertBalance = async (address: string, balance: BigNumber) => {
      assert.equal((await stableToken.balanceOf(address)).toNumber(), balance.toNumber())
    }

    describe('#transfer()', () => {
      it('should transfer balance from one user to another', async () => {
        const startBalanceFrom = await stableToken.balanceOf(sender)
        const startBalanceTo = await stableToken.balanceOf(receiver)
        await stableToken.transfer(receiver, transferAmount)
        await assertBalance(sender, startBalanceFrom.minus(transferAmount))
        await assertBalance(receiver, startBalanceTo.plus(transferAmount))
      })

      it('should not allow transferring to the null address', async () => {
        await assertRevert(stableToken.transfer(NULL_ADDRESS, transferAmount))
      })

      it('should not allow transferring more than the sender has', async () => {
        // We try to send four more tokens than the sender has, in case they happen to mine the
        // block with this transaction, which will reward them with 3 tokens.
        const value = (await stableToken.balanceOf(sender)).toNumber() + 4
        await assertRevert(stableToken.transfer(receiver, value))
      })
    })

    describe('#transferFrom()', () => {
      beforeEach(async () => {
        await stableToken.approve(receiver, transferAmount)
      })

      it('should transfer balance from one user to another', async () => {
        const startBalanceFrom = await stableToken.balanceOf(sender)
        const startBalanceTo = await stableToken.balanceOf(receiver)
        await stableToken.transferFrom(sender, receiver, transferAmount, { from: receiver })
        await assertBalance(sender, startBalanceFrom.minus(transferAmount))
        await assertBalance(receiver, startBalanceTo.plus(transferAmount))
      })

      it('should not allow transferring to the null address', async () => {
        await assertRevert(
          stableToken.transferFrom(sender, NULL_ADDRESS, transferAmount, { from: receiver })
        )
      })

      it('should not allow transferring more than the sender has', async () => {
        // We try to send four more tokens than the sender has, in case they happen to mine the
        // block with this transaction, which will reward them with 3 tokens.
        const value = (await stableToken.balanceOf(sender)).toNumber() + 4
        await stableToken.approve(receiver, value)
        await assertRevert(stableToken.transferFrom(sender, receiver, value, { from: receiver }))
      })

      it('should not allow transferring more than the spender is allowed', async () => {
        await assertRevert(
          stableToken.transferFrom(sender, receiver, 2, {
            from: receiver,
          })
        )
      })
    })
  })
})
