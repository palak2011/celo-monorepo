import { installGenericHelmChart, removeGenericHelmChart } from 'src/lib/helm_deploy'
import { envVar, execCmdWithExitOnFailure, fetchEnv } from 'src/lib/utils'

const helmChartPath = '../helm-charts/ethstats'

export async function installHelmChart(celoEnv: string) {
  return installGenericHelmChart(celoEnv, releaseName(celoEnv), helmChartPath, helmParameters())
}

export async function removeHelmRelease(celoEnv: string) {
  await removeGenericHelmChart(releaseName(celoEnv))
}

export async function upgradeHelmChart(celoEnv: string) {
  console.info(`Upgrading helm release ${releaseName(celoEnv)}`)

  const upgradeCmdArgs = `${releaseName(
    celoEnv
  )} ${helmChartPath} --namespace ${celoEnv} ${helmParameters().join(' ')}`

  if (process.env.CELOTOOL_VERBOSE === 'true') {
    await execCmdWithExitOnFailure(`helm upgrade --debug --dry-run ${upgradeCmdArgs}`)
  }
  await execCmdWithExitOnFailure(`helm upgrade ${upgradeCmdArgs}`)
  console.info(`Helm release ${releaseName(celoEnv)} upgrade successful`)
}

function helmParameters() {
  return [
    `--set domain.name=${fetchEnv(envVar.CLUSTER_DOMAIN_NAME)}`,
    `--set ethstats.webSocketSecret="${fetchEnv(envVar.ETHSTATS_WEBSOCKETSECRET)}"`,
  ]
}

function releaseName(celoEnv: string) {
  return `${celoEnv}-ethstats`
}
