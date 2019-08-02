import { BondedDeposits } from '@celo/contractkit'
import { flags } from '@oclif/command'

import { BaseCommand } from '../../base'
import { BondArgs } from '../../utils/bonds'
import { displaySendTx } from '../../utils/cli'
import { Flags } from '../../utils/command'

export default class Notify extends BaseCommand {
  static description = 'Notify a bonded deposit given notice period and gold amount'

  static flags = {
    ...BaseCommand.flags,
    from: Flags.address({ required: true }),
    noticePeriod: flags.string({ ...BondArgs.noticePeriodArg, required: true }),
    goldAmount: flags.string({ ...BondArgs.goldAmountArg, required: true }),
  }

  static examples = ['notify --noticePeriod=3600 --goldAmount=500']

  async run() {
    const bondedDeposits = await BondedDeposits(this.web3, this.from)
    await displaySendTx(
      'notify',
      bondedDeposits.methods.notify(this.result.flags.goldAmount, this.from)
    )
  }
}
