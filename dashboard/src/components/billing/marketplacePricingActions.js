import { toast } from 'vue-sonner'
import router from '../../router'
import { getToastErrorMessage } from '../../utils/toast'

export default {
	methods: {
		async loadSelectedSiteApps() {
			const request = ++this.siteAppsLoadRequest
			if (!this.selectedSite) {
				this.loadingSiteApps = false
				this.siteAppsLoadError = ''
				return
			}
			this.loadingSiteApps = true
			this.siteAppsLoadError = ''
			try {
				await Promise.all([
					this.$resources.installedApps.submit(),
					this.$resources.availableApps.submit(),
				])
			} catch (error) {
				if (request !== this.siteAppsLoadRequest) return
				this.siteAppsLoadError = getToastErrorMessage(error)
				toast.error(this.siteAppsLoadError)
			} finally {
				if (request === this.siteAppsLoadRequest) this.loadingSiteApps = false
			}
		},
		selectSite(siteName) {
			if (this.installation?.status === 'pending' && siteName !== this.selectedSite) {
				toast.info('Wait for the current installation to finish before changing sites.')
				return
			}
			this.selectedSite = siteName
		},
		openSiteApps(siteName) {
			if (siteName) router.push(`/sites/${siteName}/apps`)
		},
		installApp(app) {
			if (!this.selectedSite) {
				router.push({ name: 'InstallApp', params: { app: app.app } })
				return
			}
			if (!this.siteReady) return
			const plan = this.selectedPlanFor(app.name)
			if (!this.availabilityChecked || !this.availableAppSlugs.includes(app.app)) {
				toast.error('This app is not available for the selected site.')
				return
			}
			const paidPlanRequired = app.team !== this.$team?.doc?.name && (app.plans || []).some((option) => this.hasPaidPrice(option))
			if (paidPlanRequired && !plan) {
				toast.error('Choose a plan before installing this app.')
				return
			}
			this.installingAppName = app.app
			toast.promise(
				this.$resources.installApp.submit({
					name: this.selectedSite,
					app: app.app,
					plan: paidPlanRequired ? plan.name : undefined,
				}),
				{
					loading: `Installing ${app.title}…`,
					success: (jobId) => {
						this.installingAppName = ''
						this.installation = {
							app: app.app,
							title: app.title,
							jobId,
							startedAt: Date.now(),
							status: 'pending',
						}
						this.startInstallationPolling()
						return 'Installation started. This page will show the result.'
					},
					error: (error) => {
						this.installingAppName = ''
						return getToastErrorMessage(error)
					},
				},
			)
		},
		hasPaidPrice(plan) {
			return Number(plan.price_usd) > 0 || Number(plan.price_inr) > 0
		},
		changeAppPlan(app) {
			const installed = this.installedApp(app)
			const plan = this.selectedPlanFor(app.name)
			if (!installed?.subscription?.name || !plan) return
			if (installed.subscription.plan === plan.name) {
				toast.info('This plan is already active for the selected site.')
				return
			}
			this.changingPlanName = app.app
			toast.promise(
				this.$resources.changeAppPlan.submit({
					subscription: installed.subscription.name,
					new_plan: plan.name,
				}),
				{
					loading: `Updating ${app.title} plan…`,
					success: () => {
						this.changingPlanName = ''
						this.$resources.installedApps.submit()
						return `${app.title} plan updated`
					},
					error: (error) => {
						this.changingPlanName = ''
						return getToastErrorMessage(error)
					},
				},
			)
		},
		startInstallationPolling() {
			clearInterval(this.installationPollTimer)
			this.installationPollTimer = setInterval(this.checkInstallationStatus, 7000)
		},
		async checkInstallationStatus() {
			if (!this.installation || this.checkingInstallation) return
			this.checkingInstallation = true
			try {
				await Promise.all([
					this.$resources.sites.reload(),
					this.$resources.installedApps.submit(),
				])
				if (this.installedApps.some((app) => app.app === this.installation.app)) {
					this.installation.status = 'success'
					clearInterval(this.installationPollTimer)
					this.installationPollTimer = null
				} else if (Date.now() - this.installation.startedAt > 600000) {
					this.installation.status = 'attention'
					clearInterval(this.installationPollTimer)
					this.installationPollTimer = null
				}
			} catch (error) {
				this.installation.status = 'attention'
				clearInterval(this.installationPollTimer)
				this.installationPollTimer = null
				toast.error(getToastErrorMessage(error))
			} finally {
				this.checkingInstallation = false
			}
		},
	},
}
