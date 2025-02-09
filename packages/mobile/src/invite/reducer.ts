import * as dotProp from 'dot-prop-immutable'
import { Actions, ActionTypes, Invitees } from 'src/invite/actions'
import { getRehydratePayload, REHYDRATE, RehydrateAction } from 'src/redux/persist-helper'
import { RootState } from 'src/redux/reducers'

export interface State {
  isSendingInvite: boolean
  invitees: Invitees
  redeemComplete: boolean
  redeemedInviteCode: string
}

export const initialState: State = {
  isSendingInvite: false,
  invitees: {},
  redeemComplete: false,
  redeemedInviteCode: '',
}

export const inviteReducer = (
  state: State | undefined = initialState,
  action: ActionTypes | RehydrateAction
): State => {
  switch (action.type) {
    case REHYDRATE: {
      // Ignore some persisted properties
      return {
        ...state,
        ...getRehydratePayload(action, 'invite'),
        isSendingInvite: false,
      }
    }
    case Actions.SEND_INVITE:
      return {
        ...state,
        isSendingInvite: true,
      }
    case Actions.SEND_INVITE_FAILURE:
      return {
        ...state,
        isSendingInvite: false,
      }
    case Actions.STORE_INVITEE_DATA:
      return dotProp.merge(state, 'invitees', { [action.address]: action.e164Number })
    case Actions.REDEEM_INVITE:
      return {
        ...state,
        redeemedInviteCode: action.inviteCode,
      }
    case Actions.REDEEM_COMPLETE:
      return {
        ...state,
        redeemComplete: action.redeemComplete,
      }
    default:
      return state
  }
}

export const inviteesSelector = (state: RootState) => state.invite.invitees
