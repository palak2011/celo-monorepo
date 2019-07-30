import BigNumber from 'bignumber.js'
import { cli } from 'cli-ux'

import { makeReportTx, SortedOracles, StableToken } from '@celo/contractkit'
import { flags } from '@oclif/command'

import { BaseCommand } from '../../base'
import { displaySendTx } from '../../utils/cli'
import { Flags } from '../../utils/command'
import { Op, requireCall } from '../../utils/require'

export default class Report extends BaseCommand {
  static description = 'Report the exchange rate for Celo Dollars to Celo Gold'

  static flags = {
    ...BaseCommand.flags,
    from: flags.string({ ...Flags.address, required: true }),
    numerator: flags.integer({
      description: 'Numerator of (Celo Dollar : Celo Gold) rate',
      required: true,
    }),
    denominator: flags.integer({
      description: 'Denominator of (Celo Dollar : Celo Gold) rate',
      required: true,
    }),
  }

  static examples = ['report --numerator 10 --denominator 1']

  async run() {
    const { flags: parsedFlags } = this.parse(Report)

    if (parsedFlags.privateKey) {
      await this.setLocalSignWeb3(parsedFlags.privateKey)
    }

    const sortedOracles = await SortedOracles(this.web3)

    const stableToken = await StableToken(this.web3)
    const dollarAddr = stableToken._address
    await requireCall(
      sortedOracles.methods.isOracle(dollarAddr, parsedFlags.from),
      Op.EQ,
      false,
      'sender not an oracle'
    )

    const num = new BigNumber(parsedFlags.numerator)
    const denom = new BigNumber(parsedFlags.denominator)

    const rate = num.div(denom).toString()
    cli.action.start(`Reporting Celo Gold : Celo Dollar rate of ${rate}...`)

    const tx = await makeReportTx(this.web3, parsedFlags.from, dollarAddr, num, denom)
    await displaySendTx('report', tx)

    cli.action.stop()
  }
}
