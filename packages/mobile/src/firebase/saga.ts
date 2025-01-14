import firebase from 'react-native-firebase'
import { DataSnapshot } from 'react-native-firebase/database'
import { eventChannel } from 'redux-saga'
import { all, call, cancelled, put, select, spawn, take, takeEvery } from 'redux-saga/effects'
import { PaymentRequest, PaymentRequestStatuses, updatePaymentRequests } from 'src/account'
import { showError } from 'src/alert/actions'
import { Actions as AppActions } from 'src/app/actions'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { ALERT_BANNER_DURATION, FIREBASE_ENABLED } from 'src/config'
import { Actions, firebaseAuthorized } from 'src/firebase/actions'
import { initializeAuth, initializeCloudMessaging, setUserLanguage } from 'src/firebase/firebase'
import Logger from 'src/utils/Logger'
import { getAccount } from 'src/web3/saga'
import { currentAccountSelector } from 'src/web3/selectors'

const TAG = 'firebase/saga'
const REQUEST_DB = 'pendingRequests'
const REQUESTEE_ADDRESS = 'requesteeAddress'
const VALUE = 'value'

let firebaseAlreadyAuthorized = false
export function* waitForFirebaseAuth() {
  if (firebaseAlreadyAuthorized) {
    return
  }
  yield take(Actions.AUTHORIZED)
  firebaseAlreadyAuthorized = true
  return
}

function* initializeFirebase() {
  const address = yield call(getAccount)

  if (!FIREBASE_ENABLED) {
    Logger.info(TAG, 'Firebase disabled')
    yield put(showError(ErrorMessages.FIREBASE_DISABLED, ALERT_BANNER_DURATION))
    return
  }

  Logger.info(TAG, 'Firebase enabled')
  try {
    const app = firebase.app()
    Logger.info(
      TAG,
      `Initializing Firebase for app ${app.name}, appId ${app.options.appId}, db url ${
        app.options.databaseURL
      }`
    )
    yield call(initializeAuth, firebase, address)
    yield put(firebaseAuthorized())
    yield call(initializeCloudMessaging, firebase, address)
    Logger.info(TAG, `Firebase initialized`)

    return
  } catch (error) {
    Logger.error(TAG, 'Error while initializing firebase', error)
    yield put(showError(ErrorMessages.FIREBASE_FAILED, ALERT_BANNER_DURATION))
  }
}

function createPaymentRequestChannel(address: string) {
  const errorCallback = (error: Error) => {
    Logger.warn(TAG, error.toString())
  }

  return eventChannel((emit: any) => {
    const emitter = (data: DataSnapshot) => {
      if (data.toJSON()) {
        emit(data.toJSON())
      }
    }

    const cancel = () => {
      firebase
        .database()
        .ref(REQUEST_DB)
        .orderByChild(REQUESTEE_ADDRESS)
        .equalTo(address)
        .off(VALUE, emitter)
    }

    firebase
      .database()
      .ref(REQUEST_DB)
      .orderByChild(REQUESTEE_ADDRESS)
      .equalTo(address)
      .on(VALUE, emitter, errorCallback)
    return cancel
  })
}

const compareTimestamps = (a: PaymentRequest, b: PaymentRequest) => {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
}

const onlyRequested = (pr: PaymentRequest) => pr.status === PaymentRequestStatuses.REQUESTED

function* subscribeToPaymentRequests() {
  yield all([call(waitForFirebaseAuth), call(getAccount)])
  const address = yield select(currentAccountSelector)
  const paymentRequestChannel = yield createPaymentRequestChannel(address)
  while (true) {
    try {
      const paymentRequestsObject = yield take(paymentRequestChannel)
      const paymentRequests = Object.keys(paymentRequestsObject)
        .map((key) => ({
          uid: key,
          ...paymentRequestsObject[key],
        }))
        .sort(compareTimestamps)
        .filter(onlyRequested)
      yield put(updatePaymentRequests(paymentRequests))
    } catch (error) {
      Logger.error(`${TAG}@subscribeToPaymentRequests`, error)
    } finally {
      if (yield cancelled()) {
        paymentRequestChannel.close()
      }
    }
  }
}

const updatePaymentRequestStatus = async (id: string, status: PaymentRequestStatuses) => {
  firebase
    .database()
    .ref(`${REQUEST_DB}/${id}`)
    .update({ status })
}

export function* watchPaymentRequestStatusUpdates() {
  while (true) {
    const action = yield take(Actions.PAYMENT_REQUEST_UPDATE_STATUS)
    try {
      yield call(updatePaymentRequestStatus, action.id, action.status)
    } catch (error) {
      Logger.error(TAG, 'Error while updating payment requests status', error)
    }
  }
}

export function* syncLanguageSelection({ language }: { language: string }) {
  yield call(waitForFirebaseAuth)
  const address = yield select(currentAccountSelector)
  try {
    yield call(setUserLanguage, address, language)
  } catch (error) {
    Logger.error(TAG, 'Syncing language selection to Firebase failed', error)
  }
}

export function* watchLanguage() {
  yield takeEvery(AppActions.SET_LANGUAGE, syncLanguageSelection)
}

export function* firebaseSaga() {
  yield spawn(initializeFirebase)
  yield spawn(watchLanguage)
  yield spawn(subscribeToPaymentRequests)
  yield spawn(watchPaymentRequestStatusUpdates)
}
