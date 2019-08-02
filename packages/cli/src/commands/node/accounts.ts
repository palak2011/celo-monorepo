import { BaseCommand } from '../../base'

export default class NodeAccounts extends BaseCommand {
  static description = 'List node accounts'

  async run() {
    const accounts = await this.web3.eth.getAccounts()
    console.log(accounts)
  }
}
