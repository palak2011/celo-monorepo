#!/bin/sh

CELO_VALIDATOR_ADDRESS='0xcb681a3d0f17d1d91209a1454ff47e5010011934'
CELO_VALIDATOR_GROUP_ADDRESS='0x8c67a422ea19b525ecf934af3dedfe0b71795b2f'

NOTICE_PERIOD=5184000
AMOUNT=1000000000000000000

alias celocli="docker exec -t -i cli_container /celocli"

## account Module
# balance command
celocli account:balance $CELO_VALIDATOR_ADDRESS
celocli account:balance $CELO_VALIDATOR_GROUP_ADDRESS

# transferdollar comand
celocli account:transferdollar --from $CELO_VALIDATOR_ADDRESS --amountInWei $AMOUNT --to $CELO_VALIDATOR_GROUP_ADDRESS
celocli account:transferdollar --from $CELO_VALIDATOR_GROUP_ADDRESS --amountInWei $AMOUNT --to $CELO_VALIDATOR_ADDRESS

# transfergold command
celocli account:transfergold --from $CELO_VALIDATOR_ADDRESS --amountInWei $AMOUNT --to $CELO_VALIDATOR_GROUP_ADDRESS
celocli account:transfergold --from $CELO_VALIDATOR_GROUP_ADDRESS --amountInWei $AMOUNT --to $CELO_VALIDATOR_ADDRESS

celocli account:unlock --account $CELO_VALIDATOR_ADDRESS --password $PASSWORD
celocli account:unlock --account $CELO_VALIDATOR_GROUP_ADDRESS --password $PASSWORD


## bonds module
# register command
celocli bonds:register --from $CELO_VALIDATOR_ADDRESS
celocli bonds:register --from $CELO_VALIDATOR_GROUP_ADDRESS

# deposit command
celocli bonds:deposit --from $CELO_VALIDATOR_ADDRESS --goldAmount $AMOUNT --noticePeriod $NOTICE_PERIOD
celocli bonds:deposit --from $CELO_VALIDATOR_GROUP_ADDRESS --goldAmount $AMOUNT --noticePeriod $NOTICE_PERIOD

# show command
celocli bonds:show $CELO_VALIDATOR_ADDRESS --noticePeriod $NOTICE_PERIOD
celocli bonds:show $CELO_VALIDATOR_GROUP_ADDRESS --noticePeriod $NOTICE_PERIOD

# list command
celocli bonds:list $CELO_VALIDATOR_ADDRESS
celocli bonds:list $CELO_VALIDATOR_GROUP_ADDRESS


## validator and validatorgroup modules
# register command
celocli validator:register \
  --id "validator-id" \
  --name "validator-name" \
  --url "validator-url" \
  --from $CELO_VALIDATOR_ADDRESS \
  --noticePeriod $NOTICE_PERIOD \
  --publicKey 0x`openssl rand -hex 64`
 
celocli validatorgroup:register \
  --id "validator-group-id" \
  --name "validator-group-name" \
  --url "validator-group-url" \
  --from $CELO_VALIDATOR_GROUP_ADDRESS \
  --noticePeriod $NOTICE_PERIOD

# membership/affiliation commands
celocli validator:affiliation --set $CELO_VALIDATOR_GROUP_ADDRESS --from $CELO_VALIDATOR_ADDRESS
celocli validatorgroup:member --accept $CELO_VALIDATOR_ADDRESS --from $CELO_VALIDATOR_GROUP_ADDRESS

# vote cmommand
celocli validatorgroup:vote --from $CELO_VALIDATOR_ADDRESS --for $CELO_VALIDATOR_GROUP_ADDRESS
celocli validatorgroup:vote --from $CELO_VALIDATOR_GROUP_ADDRESS --for $CELO_VALIDATOR_GROUP_ADDRESS

