import { flags } from '@oclif/command'
import { BondedDepositAdapter } from '../../adapters/bonded-deposit'
import { BaseCommand } from '../../base'
import { displaySendTx } from '../../utils/cli'
import { Flags } from '../../utils/command'

export default class Rewards extends BaseCommand {
  static description = 'Manage rewards for bonded deposit account'

  static requiresFrom = true
  static flags = {
    redeem: flags.boolean({
      char: 'r',
      description: 'Redeem accrued rewards from bonded deposits',
      exclusive: ['delegate'],
    }),
    delegate: Flags.address({
      char: 'd',
      description: 'Delegate rewards to provided account',
      exclusive: ['redeem'],
    }),
  }

  static examples = [
    'rewards --redeem',
    'rewards --delegate=0x56e172F6CfB6c7D01C1574fa3E2Be7CC73269D95',
  ]

  async run() {
    const res = this.result

    if (!res.flags.redeem && !res.flags.delegate) {
      this.error(`Specify action with --redeem or --delegate`)
      return
    }

    const adapter = await new BondedDepositAdapter(this.web3, this.from)
    if (res.flags.redeem) {
      const contract = await adapter.contract()
      const tx = contract.methods.redeemRewards()
      await displaySendTx('redeemRewards', tx)
    }

    if (res.flags.delegate) {
      const tx = await adapter.delegateRewardsTx(this.from, res.flags.delegate)
      await displaySendTx('delegateRewards', tx)
    }
  }
}
