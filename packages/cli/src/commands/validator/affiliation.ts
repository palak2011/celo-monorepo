import { Validators } from '@celo/contractkit'
import { flags } from '@oclif/command'

import { BaseCommand } from '../../base'
import { displaySendTx } from '../../utils/cli'
import { Flags } from '../../utils/command'

export default class ValidatorAffiliate extends BaseCommand {
  static description = 'Manage affiliation to a ValidatorGroup'

  static requiresFrom = true
  static flags = {
    unset: flags.boolean({ exclusive: ['set'], description: 'clear affiliation field' }),
    set: Flags.address({
      description: 'set affiliation to given address',
      exclusive: ['unset'],
    }),
  }

  static examples = [
    'affiliation --set 0x97f7333c51897469e8d98e7af8653aab468050a3',
    'affiliation --unset',
  ]

  async run() {
    const res = this.result
    const contract = await Validators(this.web3, this.from)

    if (!(res.flags.set || res.flags.unset)) {
      this.error(`Specify action: --set or --unset`)
      return
    }

    if (res.flags.set) {
      await displaySendTx('affiliate', contract.methods.affiliate(res.flags.set))
    } else if (res.flags.unset) {
      await displaySendTx('deaffiliate', contract.methods.deaffiliate())
    }
  }
}
