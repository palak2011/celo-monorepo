import Web3 from 'web3'

import { flags } from '@oclif/command'
import { IArg, ParseFn } from '@oclif/parser/lib/args'

import { failWith } from './cli'

const parsePublicKey: ParseFn<string> = (input) => {
  if (Web3.utils.isHex(input) && input.length === 128 + 2 && input.startsWith('0x')) {
    return input
  } else {
    return failWith(`${input} is not a public key`)
  }
}
const parsePrivateKey: ParseFn<string> = (input) => {
  if (Web3.utils.isHex(input) && input.length === 64 + 2 && input.startsWith('0x')) {
    return input
  } else {
    return failWith(`${input} is not a private key`)
  }
}

const parseAddress: ParseFn<string> = (input) => {
  if (Web3.utils.isAddress(input)) {
    return input
  } else {
    return failWith(`${input} is not a valid address`)
  }
}
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
type ArgBuilder<T> = (name: string, args?: Partial<Omit<IArg<T>, 'name' | 'parse'>>) => IArg<T>
export function argBuilder<T>(parser: ParseFn<T>): ArgBuilder<T> {
  return (name, args) => ({
    name,
    ...args,
    required: true,
    parse: parser,
  })
}

export const Flags = {
  address: flags.build({
    parse: parseAddress,
    description: 'Account Address',
    helpValue: '0xc1912fEE45d61C87Cc5EA59DaE31190FFFFf232d',
  }),
  publicKey: flags.build({
    parse: parsePublicKey,
    description: 'Public Key',
    helpValue: '0x',
  }),
  privateKey: flags.build({
    parse: parsePrivateKey,
    description: 'Private Key',
    helpValue: '0x',
  }),
}

export const Args = {
  address: argBuilder(parseAddress),
}
