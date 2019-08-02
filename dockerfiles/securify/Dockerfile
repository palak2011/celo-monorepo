FROM ubuntu:18.10

LABEL maintainer="contact@chainsecurity.com"

# install basic packages
RUN apt-get update && apt-get install -y\
    software-properties-common\
    locales\
    git

# set correct locale
RUN locale-gen en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# install souffle
RUN apt-get update &&\
        apt-get -y install\
        wget\
        gdebi

RUN wget https://github.com/souffle-lang/souffle/releases/download/1.5.1/souffle_1.5.1-1_amd64.deb -O /tmp/souffle.deb &&\
        gdebi --n /tmp/souffle.deb

# # install java and pip
RUN apt-get update && apt-get -y install\
        openjdk-8-jdk\
        python3-pip


# # install truffle for project compilation
# # RUN apt-get update && apt-get install -y\
# #       nodejs\
# #       npm

# # ARG truffle="latest"
# # RUN npm install -g truffle@$truffle

# git clone
RUN git clone git://github.com/celo-org/securify.git
WORKDIR securify

RUN pip3 install -r requirements.txt

# # To cache gradle distribution
RUN ./gradlew -v
RUN ./gradlew jar

RUN ls