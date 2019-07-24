import { getStableTokenContract } from '@celo/contractkit'
import { Avatar } from '@celo/react-components/components/Avatar'
import Button, { BtnTypes } from '@celo/react-components/components/Button'
import colors from '@celo/react-components/styles/colors'
import { fontStyles } from '@celo/react-components/styles/fonts'
import { componentStyles } from '@celo/react-components/styles/styles'
import { parseInputAmount } from '@celo/utils/src/parsing'
import BigNumber from 'bignumber.js'
import React, { useEffect, useRef, useState } from 'react'
import { withNamespaces, WithNamespaces } from 'react-i18next'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { NavigationInjectedProps, NavigationScreenProps } from 'react-navigation'
import { connect } from 'react-redux'
import { hideAlert, showError, showMessage } from 'src/alert/actions'
import CeloAnalytics from 'src/analytics/CeloAnalytics'
import { CustomEventNames } from 'src/analytics/constants'
import componentWithAnalytics from 'src/analytics/wrapper'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { ERROR_BANNER_DURATION } from 'src/config'
import i18n, { Namespaces } from 'src/i18n'
import { fetchPhoneAddresses } from 'src/identity/actions'
import {
  getRecipientAddress,
  getRecipientVerificationStatus,
  VerificationStatus,
} from 'src/identity/contactMapping'
import { E164NumberToAddressType } from 'src/identity/reducer'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { RootState } from 'src/redux/reducers'
import { updateSuggestedFee } from 'src/send/actions'
import LabeledTextInput from 'src/send/LabeledTextInput'
import { getSuggestedFeeDollars } from 'src/send/selectors'
import { CeloDefaultRecipient } from 'src/send/Send'
import { ConfirmationInput } from 'src/send/SendConfirmation'
import DisconnectBanner from 'src/shared/DisconnectBanner'
import { fetchDollarBalance } from 'src/stableToken/actions'
import Logger from 'src/utils/Logger'
import { RecipientKind } from 'src/utils/recipient'

const TAG: string = 'send/SendAmount'

const MAX_COMMENT_LENGTH = 70

type Props = StateProps & DispatchProps & NavigationInjectedProps & WithNamespaces

interface StateProps {
  dollarBalance: BigNumber | null
  suggestedFeeDollars: BigNumber
  defaultCountryCode: string
  e164NumberToAddress: E164NumberToAddressType
}

interface DispatchProps {
  fetchDollarBalance: typeof fetchDollarBalance
  showMessage: typeof showMessage
  showError: typeof showError
  hideAlert: typeof hideAlert
  updateSuggestedFee: typeof updateSuggestedFee
  fetchPhoneAddresses: typeof fetchPhoneAddresses
}

const mapStateToProps = (state: RootState): StateProps => ({
  dollarBalance: state.stableToken.balance ? new BigNumber(state.stableToken.balance) : null,
  suggestedFeeDollars: getSuggestedFeeDollars(state),
  defaultCountryCode: state.account.defaultCountryCode,
  e164NumberToAddress: state.identity.e164NumberToAddress,
})

export function SendAmount(props: Props) {
  const {
    t,
    defaultCountryCode,
    navigation,
    suggestedFeeDollars,
    dollarBalance,
    e164NumberToAddress,
    hideAlert,
    showError,
    showMessage,
    fetchPhoneAddresses,
    updateSuggestedFee,
  } = props

  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const amountInput = useRef<TextInput>(null)

  const characterLimitExeeded = reason.length > MAX_COMMENT_LENGTH

  const recipient = navigation.getParam('recipient')
  if (!recipient) {
    throw new Error('Recipient expected')
  }

  useEffect(() => {
    const fetchLatestPhoneAddress = () => {
      if (recipient.kind === RecipientKind.QrCode) {
        // Skip for QR codes
        return
      }
      if (!recipient.e164PhoneNumber) {
        throw new Error('Missing recipient e164Number')
      }
      fetchPhoneAddresses([recipient.e164PhoneNumber])
    }

    fetchDollarBalance()
    fetchLatestPhoneAddress()

    // cleanup (i.e. called on unmount)
    return () => {
      hideAlert()
    }
  }, [])

  const amountGreaterThanBalance = () => {
    return parseInputAmount(amount).isGreaterThan(dollarBalance || 0)
  }

  const calculateFee = () => {
    if (amountGreaterThanBalance()) {
      // No need to update fee as the user doesn't have enough anyways
      return
    }

    if (verificationStatus === VerificationStatus.UNKNOWN) {
      // Wait for verification status before calculating fee
      return
    }

    Logger.debug(TAG, 'Updating fee')
    const params = {
      // Just use a default here since it doesn't matter for fee estimation
      recipientAddress: CeloDefaultRecipient.address!,
      amount: parseInputAmount(amount).toString(),
      comment: reason,
    }

    updateSuggestedFee(
      verificationStatus === VerificationStatus.VERIFIED,
      getStableTokenContract,
      params
    )
  }

  const calculateFeeDebounced = calculateFee // don't debounce for now

  const getAmountIsValid = () => {
    const bigNumberAmount: BigNumber = parseInputAmount(amount)
    const amountWithFees: BigNumber = bigNumberAmount.plus(suggestedFeeDollars)
    const currentBalance = dollarBalance ? new BigNumber(dollarBalance) : new BigNumber(0)

    return {
      amountIsValid: bigNumberAmount.isGreaterThan(0),
      userHasEnough: amountWithFees.isLessThanOrEqualTo(currentBalance),
    }
  }

  const { amountIsValid, userHasEnough } = getAmountIsValid()

  const verificationStatus = getRecipientVerificationStatus(recipient, e164NumberToAddress)

  const getConfirmationInput = () => {
    const recipientAddress = getRecipientAddress(recipient, e164NumberToAddress)

    const confirmationInput: ConfirmationInput = {
      recipient,
      amount: parseInputAmount(amount),
      reason,
      recipientAddress,
      fee: suggestedFeeDollars,
    }
    return confirmationInput
  }

  const onRequest = () => {
    CeloAnalytics.track(CustomEventNames.request_payment_continue)
    const confirmationInput = getConfirmationInput()
    CeloAnalytics.track(CustomEventNames.send_invite_details, {
      requesteeAddress: confirmationInput.recipientAddress,
    })
    navigate(Screens.RequestConfirmation, { confirmationInput })
  }

  const onSend = () => {
    CeloAnalytics.track(CustomEventNames.send_continue)
    hideAlert()

    // TODO(Rossy) this almost never shows because numeral is swalling the errors
    // and returning 0 for invalid numbers
    if (!amountIsValid) {
      showError(ErrorMessages.INVALID_AMOUNT, ERROR_BANNER_DURATION)
      return
    }

    if (!userHasEnough) {
      showError(ErrorMessages.NSF_TO_SEND, ERROR_BANNER_DURATION)
      return
    }

    const confirmationInput = getConfirmationInput()
    if (verificationStatus === VerificationStatus.VERIFIED) {
      CeloAnalytics.track(CustomEventNames.transaction_details, {
        recipientAddress: confirmationInput.recipientAddress,
      })
    } else {
      CeloAnalytics.track(CustomEventNames.send_invite_details)
    }
    navigate(Screens.SendConfirmation, { confirmationInput })
  }

  const onAmountChanged = (newAmount: string) => {
    setAmount(newAmount)
    calculateFeeDebounced()
  }

  const onReasonChanged = (newReason: string) => {
    if (newReason.length > MAX_COMMENT_LENGTH) {
      showMessage(t('characterLimitExceeded', { max: MAX_COMMENT_LENGTH }))
    } else {
      hideAlert()
    }

    setReason(newReason)
    calculateFeeDebounced()
  }

  const renderButtons = () => {
    const requestDisabled =
      !amountIsValid || verificationStatus !== VerificationStatus.VERIFIED || characterLimitExeeded
    const sendDisabled =
      !amountIsValid ||
      !userHasEnough ||
      characterLimitExeeded ||
      verificationStatus === VerificationStatus.UNKNOWN

    const separatorContainerStyle =
      sendDisabled && requestDisabled
        ? style.separatorContainerInactive
        : style.separatorContainerActive
    const separatorStyle =
      sendDisabled && requestDisabled ? style.buttonSeparatorInactive : style.buttonSeparatorActive

    return (
      <View style={[componentStyles.bottomContainer, style.buttonContainer]}>
        {verificationStatus !== VerificationStatus.UNVERIFIED && (
          <View style={style.button}>
            <Button
              onPress={onRequest}
              text={t('request')}
              accessibilityLabel={t('request')}
              standard={false}
              type={BtnTypes.PRIMARY}
              disabled={requestDisabled}
            />
          </View>
        )}
        <View style={[style.separatorContainer, separatorContainerStyle]}>
          <View style={[style.buttonSeparator, separatorStyle]} />
        </View>
        <View style={style.button}>
          <Button
            onPress={onSend}
            text={verificationStatus === VerificationStatus.VERIFIED ? t('send') : t('invite')}
            accessibilityLabel={t('send')}
            standard={false}
            type={BtnTypes.PRIMARY}
            disabled={sendDisabled}
          />
        </View>
      </View>
    )
  }

  const renderBottomContainer = () => {
    const onPress = () => {
      if (amountInput.current) {
        amountInput.current.focus()
      }
    }

    if (!amountIsValid) {
      return (
        <TouchableWithoutFeedback onPress={onPress}>{renderButtons()}</TouchableWithoutFeedback>
      )
    }
    return renderButtons()
  }

  return (
    <View style={style.body}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="always"
        contentContainerStyle={style.scrollViewContentContainer}
      >
        <DisconnectBanner />
        <Avatar
          name={recipient.displayName}
          address={recipient.address}
          e164Number={recipient.e164PhoneNumber}
          defaultCountryCode={defaultCountryCode}
          iconSize={40}
        />
        {verificationStatus === VerificationStatus.UNKNOWN && (
          <View style={style.verificationStatusContainer}>
            <Text style={[fontStyles.bodySmall]}>{t('loadingVerificationStatus')}</Text>
            <ActivityIndicator style={style.loadingIcon} size="small" color={colors.celoGreen} />
          </View>
        )}
        {verificationStatus === VerificationStatus.UNVERIFIED && (
          <Text style={[style.inviteDescription, fontStyles.bodySmall]}>
            {t('inviteMoneyEscrow')}
          </Text>
        )}
        <LabeledTextInput
          ref={amountInput}
          keyboardType="numeric"
          title={'$'}
          placeholder={t('amount')}
          labelStyle={style.amountLabel as TextStyle}
          placeholderColor={colors.celoGreenInactive}
          value={amount}
          onValueChanged={onAmountChanged}
          autoFocus={true}
          numberOfDecimals={2}
        />
        <LabeledTextInput
          keyboardType="default"
          title={t('for')}
          placeholder={t('groceriesRent')}
          value={reason}
          onValueChanged={onReasonChanged}
        />
      </KeyboardAwareScrollView>
      {renderBottomContainer()}
    </View>
  )
}

SendAmount.navigationOptions = ({ navigation }: NavigationScreenProps) => ({
  headerTitle: i18n.t('send_or_request', { ns: Namespaces.sendFlow7 }),
  headerTitleStyle: [fontStyles.headerTitle, componentStyles.screenHeader],
  headerRight: <View />, // This helps vertically center the title
})

const style = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: 'white',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  scrollViewContentContainer: {
    justifyContent: 'space-between',
  },
  avatar: {
    marginTop: 10,
    alignSelf: 'center',
    margin: 'auto',
  },
  label: {
    alignSelf: 'center',
    color: colors.dark,
  },
  inviteDescription: {
    paddingHorizontal: 65,
    marginVertical: 10,
    textAlign: 'center',
  },
  sendContainer: {
    paddingVertical: 10,
  },
  sendToLabel: {
    color: colors.darkSecondary,
  },
  sendToLabelDark: {
    color: colors.dark,
  },
  amountLabel: {
    color: colors.celoGreen,
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'row',
  },
  button: {
    flex: 1,
  },
  separatorContainer: {
    height: 50,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  separatorContainerInactive: {
    backgroundColor: colors.celoGreenInactive,
  },
  separatorContainerActive: {
    backgroundColor: colors.celoGreen,
  },
  buttonSeparatorInactive: {
    backgroundColor: colors.celoDarkGreenInactive,
  },
  buttonSeparatorActive: {
    backgroundColor: colors.celoDarkGreen,
  },
  buttonSeparator: {
    width: 2,
    height: 40,
  },
  verificationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  loadingIcon: {
    marginHorizontal: 5,
  },
})

export default componentWithAnalytics(
  connect<StateProps, DispatchProps, {}, RootState>(
    mapStateToProps,
    {
      fetchDollarBalance,
      showError,
      hideAlert,
      updateSuggestedFee,
      showMessage,
      fetchPhoneAddresses,
    }
  )(withNamespaces(Namespaces.sendFlow7)(SendAmount))
)
