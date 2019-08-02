import { BaseCommand } from '../../base'
import { printValueMap } from '../../utils/cli'
import { readConfig } from '../../utils/config'

export default class Get extends BaseCommand {
  static description = 'Output configuration'

  static requiresWeb3 = false

  async run() {
    printValueMap(readConfig(this.config.configDir))
  }
}
