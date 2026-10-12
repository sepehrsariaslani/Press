import { useState } from 'react';
import { getAccountsPreviewHref } from '../../components/site/accountsPreviewRoute';
import { productModuleDetails } from '../moduleDetails';
import { productModules } from '../modules';
import { RoleSystemPreview } from './RoleSystemPreview';
import { roleDashboards } from './roleData';
import './role-showcase.css';

export function RoleShowcase() {
	const [activeRoleId, setActiveRoleId] = useState(roleDashboards[0].id);
	const activeRole = roleDashboards.find(role => role.id === activeRoleId) || roleDashboards[0];
	const [activeModuleId, setActiveModuleId] = useState<string | null>(activeRole.entryPath ? null : activeRole.moduleIds[0]);
	const relatedModules = activeRole.moduleIds
		.map(id => productModules.find(module => module.id === id))
		.filter((module): module is (typeof productModules)[number] => Boolean(module));
	const selectedModule = activeModuleId ? productModules.find(module => module.id === activeModuleId) : undefined;
	const entryPath = activeModuleId ? productModuleDetails[activeModuleId]?.entryPath : activeRole.entryPath;
	const entryHref = getAccountsPreviewHref(`/hesab${entryPath || '/tasks'}`);

	function selectRole(roleId: string) {
		const role = roleDashboards.find(item => item.id === roleId) || roleDashboards[0];
		setActiveRoleId(role.id);
		setActiveModuleId(role.entryPath ? null : role.moduleIds[0] || null);
	}

	return <section className="role-showcase" id="roles" aria-labelledby="role-showcase-title" dir="rtl">
		<div className="role-showcase-inner">
			<header className="role-showcase-heading">
				<p className="role-showcase-eyebrow"><span aria-hidden="true" /> یک سیستم، چند نگاه</p>
				<h2 id="role-showcase-title">هر نقش، <span>تصویر لازم خودش.</span></h2>
				<p>نقش را انتخاب کن تا صفحه‌ی واقعی مرتبط در آسومی باز شود. منو و اطلاعات نمایش‌داده‌شده را حساب واردشده و مجوزهای همان حساب تعیین می‌کنند.</p>
			</header>
			<div className="role-showcase-workspace">
				<div className="role-picker" role="group" aria-label="انتخاب نقش برای بازکردن صفحه‌ی واقعی">
					{roleDashboards.map((role, index) => <button key={role.id} type="button" aria-pressed={activeRole.id === role.id} onClick={() => selectRole(role.id)}>
						<span aria-hidden="true">{String(index + 1).padStart(2, '0').replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])}</span>{role.label}
					</button>)}
				</div>
				<div className="role-selected-copy" aria-live="polite">
					<div><span className="role-current-label">حوزه‌ی انتخاب‌شده</span><h3>{activeRole.label}</h3><p>{activeRole.description}</p></div>
					<div className="role-module-links" role="group" aria-label="صفحه‌های مرتبط را در محیط واقعی باز کن">
						{relatedModules.map(module => <button key={module.id} type="button" aria-pressed={activeModuleId === module.id} onClick={() => setActiveModuleId(module.id)}>{module.shortTitle}</button>)}
					</div>
				</div>
				<RoleSystemPreview roleLabel={activeRole.label} sectionLabel={selectedModule?.shortTitle || 'داشبورد مدیریتی'} entryHref={entryHref} />
			</div>
		</div>
	</section>;
}
