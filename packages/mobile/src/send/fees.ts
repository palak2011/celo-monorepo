import BigNumber from 'bignumber.js'
import { VerificationStatus } from 'src/identity/contactMapping'
import { getInvitationVerificationFee } from 'src/invite/saga'
import { BasicTokenTransfer, createTransaction } from 'src/tokens/saga'
import { divideByWei } from 'src/utils/formatting'
import Logger from 'src/utils/Logger'
import { web3 } from 'src/web3/contracts'
import { fetchGasPrice } from 'src/web3/gas'

const TAG = 'send/fee'

export async function getSuggestedFee(
  account: string | null,
  verificationStatus: VerificationStatus,
  contractGetter: any,
  params: BasicTokenTransfer
) {
  try {
    switch (verificationStatus) {
      case VerificationStatus.UNKNOWN:
        // Wait for verification status before calculating fee
        return undefined
      case VerificationStatus.VERIFIED: {
        // create mock transaction and get gas

        const tx = await createTransaction(contractGetter, params)

        const txParams: any = { from: account, gasCurrency: contractGetter(web3)._address }
        const gas: BigNumber = new BigNumber(await tx.estimateGas(txParams))
        const gasPrice: BigNumber = new BigNumber(await fetchGasPrice())

        Logger.debug(`${TAG}/getSuggestedFee`, `estimated gas: ${gas}`)
        Logger.debug(`${TAG}/getSuggestedFee`, `gas price: ${gasPrice}`)

        const suggestedFeeInWei: BigNumber = gas.multipliedBy(gasPrice)

        Logger.debug(`${TAG}/getSuggestedFee`, `New fee is: ${suggestedFeeInWei}`)
        return suggestedFeeInWei
      }
      case VerificationStatus.UNVERIFIED: {
        // invitation
        // TODO add verification fee + transfer costs + Escrow
        const verificationFee = await getInvitationVerificationFee()
        return verificationFee
      }
    }
  } catch (error) {
    Logger.error(`${TAG}/getSuggestedFee`, 'Could not get suggested fee', error)
    throw error
  }
}

export function getFeeDollars(fee: number | string) {
  const adjustedFee = divideByWei(fee, 18)
  return new BigNumber(adjustedFee)
}
