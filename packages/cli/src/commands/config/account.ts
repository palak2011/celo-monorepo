import { BaseCommand } from '../../base'
import { Args } from '../../utils/command'
import { CeloConfig, readConfig, writeConfig } from '../../utils/config'

export default class Account extends BaseCommand {
  static description = 'Configure account address which node can provide signatures for'

  static args = [Args.address('account')]

  static examples = ['account 0x47e172F6CfB6c7D01C1574fa3E2Be7CC73269D95']

  static requiresWeb3 = false

  async run() {
    const args = this.result.args
    const oldConfig = await readConfig(this.config.configDir)
    const config: CeloConfig = {
      ...oldConfig,
      fromAccount: args.account,
    }
    await writeConfig(this.config.configDir, config)
  }
}
