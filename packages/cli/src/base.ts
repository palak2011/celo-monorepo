import { Command, flags } from '@oclif/command'
import Web3 from 'web3'
import { getFromAccount, getNodeUrl } from './utils/config'
import { injectDebugProvider } from './utils/eth-debug-provider'
import { Address, NULL_ADDRESS } from './utils/helpers'
export abstract class BaseCommand extends Command {
  static flags = {
    logLevel: flags.string({ hidden: true }),
    help: flags.help({ hidden: true }),
  }

  private _web3: Web3 | null = null
  // This is required since we wrap the provider with a debug provider and
  // there is no way to unwrap the provider afterwards.
  // We need access to the original provider, so that, we can close it.
  private _originalProvider: any | null = null

  get web3() {
    if (!this._web3) {
      this._web3 = new Web3(getNodeUrl(this.config.configDir))
      this._originalProvider = this._web3.currentProvider
      injectDebugProvider(this._web3)
    }
    return this._web3
  }

  protected get statics(): typeof BaseCommand {
    return this.constructor as typeof BaseCommand
  }

  get fromAccount(): string {
    // tslint:disable-next-line no-shadowed-variable
    const { flags } = this.parse(this.statics.flags)
    if (flags.from) {
      return flags.from
    } else {
      const configuredFrom = getFromAccount(this.config.configDir)
      if (configuredFrom === NULL_ADDRESS) {
        throw new Error('Provide from account with --from ADDRESS or config:account ADDRESS')
      }
      return configuredFrom
    }
  }

  // TODO(yorke): implement log(msg) switch on logLevel with chalk colored output
  log(msg: string, logLevel: string = 'info') {
    if (logLevel === 'info') {
      console.debug(msg)
    } else if (logLevel === 'error') {
      console.error(msg)
    }
  }

  finally(arg: Error | undefined): Promise<any> {
    try {
      // Close the web3 connection or the CLI hangs forever.
      if (this._originalProvider && this._originalProvider.hasOwnProperty('connection')) {
        const connection = this._originalProvider.connection
        if (connection.hasOwnProperty('_connection')) {
          connection._connection.close()
        }
      }
    } catch (error) {
      this.log(`Failed to close the connection: ${error}`)
    }

    return super.finally(arg)
  }
}
