import { includedERPNextModules } from '@/data/pricing'

export default {
	resources: {
		pricingCatalog() {
			return {
				url: 'press.api.marketplace.get_marketplace_pricing_catalog',
				auto: true,
				initialData: [],
			}
		},
		sites() {
			return {
				type: 'list',
				doctype: 'Site',
				fields: ['name', 'host_name', 'status'],
				filters: { status: ['in', ['Active', 'Pending', 'Installing']] },
				orderBy: 'creation desc',
				pageLength: 500,
				auto: true,
				onSuccess: (sites) => {
					if (sites.some((site) => site.name === this.selectedSite)) return
					this.selectedSite = sites.find((site) => site.status === 'Active')?.name || ''
				},
			}
		},
		installedApps() {
			return {
				url: 'press.api.site.installed_apps',
				makeParams: () => ({ name: this.selectedSite }),
				initialData: [],
				auto: false,
			}
		},
		availableApps() {
			return {
				url: 'press.api.site.available_apps',
				makeParams: () => ({ name: this.selectedSite }),
				initialData: [],
				auto: false,
			}
		},
		installApp() {
			return { url: 'press.api.site.install_app' }
		},
		changeAppPlan() {
			return { url: 'press.api.marketplace.change_app_plan' }
		},
	},
	data() {
		return {
			selectedSite: '',
			selectedAppNames: [],
			selectedPlans: {},
			freeERPNextModules: includedERPNextModules,
			installingAppName: '',
			changingPlanName: '',
			checkingInstallation: false,
			loadingSiteApps: false,
			siteAppsLoadError: '',
			siteAppsLoadRequest: 0,
			installation: null,
			installationPollTimer: null,
		}
	},
	watch: {
		selectedSite() {
			this.installation = null
			clearInterval(this.installationPollTimer)
			this.installationPollTimer = null
			this.$resources.installedApps.data = []
			this.$resources.availableApps.data = []
			this.siteAppsLoadError = ''
			this.loadSelectedSiteApps()
		},
	},
	beforeUnmount() {
		clearInterval(this.installationPollTimer)
	},
	computed: {
		apps() {
			return this.$resources.pricingCatalog.data || []
		},
		sites() {
			return this.$resources.sites.data || []
		},
		installedApps() {
			return this.$resources.installedApps.data || []
		},
		availableApps() {
			return this.$resources.availableApps.data || []
		},
		selectedSiteDoc() {
			return this.sites.find((site) => site.name === this.selectedSite)
		},
		siteReady() {
			return this.selectedSiteDoc?.status === 'Active'
		},
		availabilityChecked() {
			return Boolean(this.selectedSite && !this.loadingSiteApps && !this.siteAppsLoadError)
		},
		availableAppSlugs() {
			return this.availableApps.map((app) => app.app)
		},
		pricingApps() {
			return this.apps.map((app) => {
				const siteApp = this.availableApps.find((item) => item.app === app.app)
				return siteApp ? { ...app, plans: siteApp.plans || [] } : app
			})
		},
		visibleSelectedPlans() {
			return Object.fromEntries(
				Object.entries(this.selectedPlans).filter(([appName, selectedPlan]) => {
					return this.pricingApps.find((app) => app.name === appName)?.plans?.some(
						(plan) => plan.name === selectedPlan?.name,
					)
				}),
			)
		},
		installedMarketplaceApps() {
			const slugs = new Set(this.apps.map((app) => app.app))
			return this.installedApps.filter((app) => slugs.has(app.app))
		},
		installedAppSlugs() {
			return this.installedMarketplaceApps.map((app) => app.app)
		},
		changeableAppSlugs() {
			return this.pricingApps
				.filter((app) => {
					const installed = this.installedApps.find((item) => item.app === app.app)
					return installed?.subscription?.name && app.plans?.some((plan) => plan.name !== installed.subscription.plan)
				})
				.map((app) => app.app)
		},
		currentPlanNames() {
			return Object.fromEntries(
				this.installedMarketplaceApps
					.filter((app) => app.subscription?.plan)
					.map((app) => [app.app, app.subscription.plan]),
			)
		},
		busyAppSlugs() {
			return [this.installingAppName, this.changingPlanName].filter(Boolean)
		},
		selectedEntries() {
			return this.selectedAppNames
				.map((name) => ({
					app: this.pricingApps.find((app) => app.name === name),
					plan: this.selectedPlanFor(name),
				}))
				.filter((entry) => entry.app)
		},
		selectedTotal() {
			return this.selectedEntries.reduce((total, entry) => {
				const price = this.priceAmount(entry.plan)
				return Number.isFinite(price) ? total + price : total
			}, 0)
		},
		unpricedSelectionCount() {
			return this.selectedEntries.filter((entry) => !Number.isFinite(this.priceAmount(entry.plan))).length
		},
		priceField() {
			return this.$team?.doc?.currency === 'INR' ? 'price_inr' : 'price_usd'
		},
	},
	methods: {
		selectedPlanFor(appName) {
			const app = this.pricingApps.find((item) => item.name === appName)
			const selected = this.selectedPlans[appName]
			const validSelection = app?.plans?.find((plan) => plan.name === selected?.name)
			if (validSelection) return validSelection
			const currentPlanName = this.installedApp(app)?.subscription?.plan
			return app?.plans?.find((plan) => plan.name === currentPlanName) || this.defaultPlan(app)
		},
		toggleApp(app) {
			if (this.selectedAppNames.includes(app.name)) {
				this.selectedAppNames = this.selectedAppNames.filter((name) => name !== app.name)
				return
			}
			this.selectedAppNames = [...this.selectedAppNames, app.name]
			if (!this.selectedPlans[app.name]) {
				this.selectPlan(app, this.selectedPlanFor(app.name))
			}
		},
		defaultPlan(app) {
			if (!app) return null
			return [...(app.plans || [])].sort((first, second) => {
				return this.priceAmount(first) - this.priceAmount(second)
			})[0] || null
		},
		priceAmount(plan) {
			if (!plan) return NaN
			const value = plan[this.priceField]
			if (value === null || value === undefined || value === '') return NaN
			return Number(value)
		},
		selectPlan(app, plan) {
			if (!plan) return
			this.selectedPlans = { ...this.selectedPlans, [app.name]: plan }
		},
		clearSelection() {
			this.selectedAppNames = []
			this.selectedPlans = {}
		},
		installedApp(app) {
			return this.installedApps.find((installed) => installed.app === app?.app)
		},
	},
}
