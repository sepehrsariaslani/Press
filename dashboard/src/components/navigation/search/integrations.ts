import { reactive, watch } from 'vue';
import { createListResource } from 'frappe-ui';

export const integrations = reactive({
	سایت‌ها: {
		icon: LucidePanelTopInactive,
		items: [],
	},

	سرورها: {
		icon: LucideServer,
		items: [],
	},

	بنچ‌ها: {
		icon: LucideBoxes,
		items: [],
	},
});

export const addIntegrations = () => {
	let siteList = createListResource({
		auto: true,
		doctype: 'Site',
		cache: ['ObjectList', 'Site'],
		fields: ['name', 'status'],
		pageLength: 10000,
		onSuccess(data) {
			const defaultItems = [
				{ name: 'لیست', route: '/sites', icon: LucideCircleDashed },
				{ name: 'جدید', route: '/sites/new', icon: LucideCirclePlus },
			];

			const tmp = data.map((x) => {
				const route = `/sites/${x.name}/overview`;
				return { ...x, route, icon: LucideEarth };
			});
			integrations['سایت‌ها'].items = defaultItems.concat(tmp);
		},
	});

	let benches = createListResource({
		auto: true,
		doctype: 'Release Group',
		cache: ['ObjectList', 'Release Group'],
		fields: ['name', 'status', 'title', 'sites'],
		pageLength: 10000,
		onSuccess(data) {
			const defaultItems = [
				{ name: 'جدید', route: '/groups/new', icon: LucideCirclePlus },
			];
			const tmp = data.map((x) => {
				const route = `/groups/${x.name}/sites`;
				return { ...x, route, icon: LucideBoxes };
			});
			integrations['بنچ‌ها'].items = defaultItems.concat(tmp);
		},
	});

	let serverList = createListResource({
		auto: true,
		doctype: 'Server',
		cache: ['ObjectList', 'Server'],
		fields: ['name', 'status', 'title', 'sites'],
		pageLength: 10000,
		onSuccess(data) {
			const defaultItems = [
				{ name: 'لیست', route: '/servers', icon: LucideCircleDashed },
				{ name: 'جدید', route: '/servers/new', icon: LucideCirclePlus },
			];
			const tmp = data.map((x) => {
				const route = `/servers/${x.name}/overview`;
				return { ...x, route, icon: LucideServer };
			});
			integrations['سرورها'].items = defaultItems.concat(tmp);
		},
	});
};
