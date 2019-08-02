import { BaseCommand } from '../../base'
import { Args } from '../../utils/command'
import { CeloConfig, readConfig, writeConfig } from '../../utils/config'

export default class Node extends BaseCommand {
  static description = 'Configure running node URL with exposed RPC at port'

  static args = [Args.url('node', { required: true })]

  static examples = ['node http://localhost:8545']

  static requiresWeb3 = false

  async run() {
    const args = this.result.args
    const oldConfig = await readConfig(this.config.configDir)
    const config: CeloConfig = {
      ...oldConfig,
      nodeUrl: args.url,
    }
    await writeConfig(this.config.configDir, config)
  }
}
