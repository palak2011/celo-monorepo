import AwesomeDebouncePromise from 'awesome-debounce-promise'
import BigNumber from 'bignumber.js'
import { useRef } from 'react'
import { useAsync } from 'react-async-hook'
import { INPUT_DEBOUNCE_TIME } from 'src/config'
import { VerificationStatus } from 'src/identity/contactMapping'
import { getSuggestedFee } from 'src/send/fees'
import { BasicTokenTransfer } from 'src/tokens/saga'
import useConstant from 'src/utils/useConstant'

export function useCalculateFee(
  account: string | null,
  verificationStatus: VerificationStatus,
  contractGetter: any,
  params: BasicTokenTransfer
) {
  // Create a constant debounced function (created only once per component instance)
  const debouncedGetSuggestedFee = useConstant(() =>
    AwesomeDebouncePromise(getSuggestedFee, INPUT_DEBOUNCE_TIME)
  )

  // Simply use it with useAsync
  const asyncGetSuggestedFee = useAsync(debouncedGetSuggestedFee, [
    account,
    verificationStatus,
    contractGetter,
    params,
  ])

  // Keep last defined result
  const ref = useRef<BigNumber | undefined>()
  ref.current = asyncGetSuggestedFee.result || ref.current

  return ref.current
}
