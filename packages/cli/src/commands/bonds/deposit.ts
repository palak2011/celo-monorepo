import Web3 from 'web3'

import { BondedDeposits } from '@celo/contractkit'
import { flags } from '@oclif/command'

import { BaseCommand } from '../../base'
import { BondArgs } from '../../utils/bonds'
import { displaySendTx, failWith } from '../../utils/cli'
import { Flags } from '../../utils/command'
import { Address } from '../../utils/helpers'
import { Op, requireCall } from '../../utils/require'

export default class Deposit extends BaseCommand {
  static description = 'Create a bonded deposit given notice period and gold amount'

  static requiresFrom = true
  static flags = {
    noticePeriod: flags.string({ ...BondArgs.noticePeriodArg, required: true }),
    goldAmount: flags.string({ ...BondArgs.goldAmountArg, required: true }),
  }

  static examples = [
    'deposit --from 0x47e172F6CfB6c7D01C1574fa3E2Be7CC73269D95 --noticePeriod 8640 --goldAmount 1000000000000000000',
    'deposit --noticePeriod 8640 --goldAmount 1000000000000000000',
  ]

  async run() {
    const goldAmount = Web3.utils.toBN(this.result.flags.goldAmount)
    const noticePeriod = Web3.utils.toBN(this.result.flags.noticePeriod)

    const bondedDeposits = await BondedDeposits(this.web3, this.from)

    await requireCall(bondedDeposits.methods.isVoting(this.from), Op.EQ, false, '!isVoting')

    const maxNoticePeriod = Web3.utils.toBN(await bondedDeposits.methods.maxNoticePeriod().call())
    if (!maxNoticePeriod.gte(noticePeriod)) {
      failWith(`require(noticePeriod <= maxNoticePeriod) => [${noticePeriod}, ${maxNoticePeriod}]`)
    }
    if (!goldAmount.gt(Web3.utils.toBN(0))) {
      failWith(`require(goldAmount > 0) => [${goldAmount}]`)
    }

    // await displaySendTx('redeemRewards', bondedDeposits.methods.redeemRewards())
    const tx = bondedDeposits.methods.deposit(noticePeriod.toString())
    await displaySendTx('deposit', tx, { value: goldAmount.toString() })
  }
}
