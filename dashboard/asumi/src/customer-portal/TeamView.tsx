import { useEffect, useState, type FormEvent } from 'react';
import { cancelTeamInvitation, getTeamAccess, inviteTeamMember, removeTeamMember, updateTeamMemberRoles, type TeamAccessData, type TeamMember } from './portalApi';

export function TeamView() {
	const [data, setData] = useState<TeamAccessData | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [email, setEmail] = useState('');
	const [role, setRole] = useState('');
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	async function load(signal?: AbortSignal) {
		try {
			const next = await getTeamAccess(signal);
			if (!signal?.aborted) { setData(next); setError(''); }
		} catch (caught) {
			if (!signal?.aborted) setError(messageOf(caught));
		} finally {
			if (!signal?.aborted) setLoading(false);
		}
	}

	useEffect(() => {
		const controller = new AbortController();
		void load(controller.signal);
		return () => controller.abort();
	}, []);

	async function submitInvite(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true); setError(''); setNotice('');
		try {
			await inviteTeamMember(email.trim(), role || undefined);
			setEmail(''); setRole('');
			setNotice('دعوت‌نامه برای همکار ارسال شد.');
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	async function cancelInvite(memberEmail: string) {
		if (!window.confirm(`دعوت ${memberEmail} لغو شود؟`)) return;
		setBusy(true); setError('');
		try { await cancelTeamInvitation(memberEmail); setNotice('دعوت‌نامه لغو شد.'); await load(); }
		catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	async function removeMember(member: TeamMember) {
		if (!window.confirm(`دسترسی ${member.email} از این تیم برداشته شود؟`)) return;
		setBusy(true); setError('');
		try { await removeTeamMember(member.email); setNotice('دسترسی همکار حذف شد.'); await load(); }
		catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	async function saveMemberRoles(member: TeamMember, roles: string[]) {
		setBusy(true); setError(''); setNotice('');
		try {
			await updateTeamMemberRoles(member.email, roles);
			setNotice(`دسترسی ${member.email} به‌روز شد.`);
			await load();
		} catch (caught) { setError(messageOf(caught)); }
		finally { setBusy(false); }
	}

	if (loading) return <div className="customer-portal-state" role="status">در حال دریافت اعضای تیم…</div>;
	if (error && !data) return <section className="customer-portal-state customer-portal-state--error" role="alert"><h2>اعضا بارگذاری نشدند</h2><p>{error}</p><button type="button" onClick={() => { setLoading(true); void load(); }}>تلاش دوباره</button></section>;
	if (!data) return null;

	const activeMembers = data.members.filter(member => member.status !== 'Pending');
	const pending = data.members.filter(member => member.status === 'Pending');
	return <div className="customer-portal-workspace">
		<section className="customer-portal-panel" aria-labelledby="portal-team-title">
			<div className="customer-portal-panel-heading"><div><p>اعضا و دسترسی</p><h2 id="portal-team-title">تیم {data.team.title}</h2></div><span>{new Intl.NumberFormat('fa-IR').format(activeMembers.length)} عضو</span></div>
			<p className="customer-portal-help-copy">نقش هر همکار مشخص می‌کند به ماژول‌ها و امور مالی دسترسی داشته باشد یا نه. مدیر تیم می‌تواند نقش اعضا را همین‌جا تغییر دهد.</p>
			{error && <div className="customer-portal-inline-error" role="alert"><span>{error}</span></div>}
			{notice && <p className="customer-portal-inline-status" role="status">{notice}</p>}
		<div className="customer-portal-team-list">{activeMembers.map(member => <MemberRow key={member.email} member={member} roles={data.roles} canManage={data.can_manage_members} onRemove={() => void removeMember(member)} onSaveRoles={selected => void saveMemberRoles(member, selected)} busy={busy} />)}</div>
			{pending.length > 0 && <><div className="customer-portal-panel-heading customer-portal-subheading"><div><p>در انتظار پذیرش</p><h3>دعوت‌های ارسال‌شده</h3></div><span>{new Intl.NumberFormat('fa-IR').format(pending.length)}</span></div>
				<div className="customer-portal-team-list">{pending.map(member => <article className="customer-portal-member" key={member.email}><div className="customer-portal-member-avatar" aria-hidden="true">…</div><div className="customer-portal-member-main"><strong>{member.email}</strong><small>دعوت در انتظار پذیرش</small></div><span className="customer-portal-status" data-status="pending">در انتظار</span>{data.can_manage_members && <button type="button" className="customer-portal-text-button" disabled={busy} onClick={() => void cancelInvite(member.email)}>لغو دعوت</button>}</article>)}</div>
			</>}
		</section>
		{data.can_manage_members && <section className="customer-portal-panel" aria-labelledby="portal-invite-title">
			<div className="customer-portal-panel-heading"><div><p>دعوت همکار</p><h2 id="portal-invite-title">افزودن عضو به تیم</h2></div></div>
			<form className="customer-portal-invite-form" onSubmit={event => void submitInvite(event)}>
				<label><span>ایمیل همکار</span><input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" /></label>
				<label><span>نقش تیمی</span><select value={role} onChange={event => setRole(event.target.value)}><option value="">دسترسی پیش‌فرض تیم</option>{data.roles.map(item => <option key={item.name} value={item.name}>{roleTitle(item)}</option>)}</select></label>
				<p>دسترسی ماژول‌ها و مدیریت مالی بر اساس نقش انتخابی تعیین می‌شود. نقش مناسب را پیش از دعوت انتخاب کن.</p>
				<button type="submit" className="customer-portal-primary-button" disabled={busy || !email.trim()}>{busy ? 'در حال ارسال…' : 'ارسال دعوت‌نامه'}</button>
			</form>
		</section>}
	</div>;
}

function MemberRow({ member, roles, canManage, onRemove, onSaveRoles, busy }: { member: TeamMember; roles: TeamAccessData['roles']; canManage: boolean; onRemove: () => void; onSaveRoles: (roles: string[]) => void; busy: boolean }) {
	return <article className="customer-portal-member">
		{member.user_image ? <img src={member.user_image} alt="" className="customer-portal-member-photo" /> : <div className="customer-portal-member-avatar" aria-hidden="true">{(member.user_name || member.email).slice(0, 1).toLocaleUpperCase()}</div>}
		<div className="customer-portal-member-main"><strong>{member.user_name || member.email}</strong><small>{member.email}</small></div>
		<div className="customer-portal-role-tags">{member.roles?.length ? member.roles.map(item => <span key={item.name}>{roleTitle(item)}</span>) : <span>{member.has_admin_access ? 'مدیر تیم' : 'عضو تیم'}</span>}</div>
		{canManage && !member.has_admin_access && roles.length > 0 && <MemberRoleEditor member={member} roles={roles} busy={busy} onSave={onSaveRoles} />}
		{canManage && !member.has_admin_access && <button type="button" className="customer-portal-text-button" disabled={busy} onClick={onRemove}>حذف دسترسی</button>}
	</article>;
}

function MemberRoleEditor({ member, roles, busy, onSave }: { member: TeamMember; roles: TeamAccessData['roles']; busy: boolean; onSave: (roles: string[]) => void }) {
	const [selected, setSelected] = useState(() => (member.roles || []).map(role => role.name));
	useEffect(() => setSelected((member.roles || []).map(role => role.name)), [member.roles]);
	const current = (member.roles || []).map(role => role.name).sort();
	const changed = current.join('\0') !== [...selected].sort().join('\0');
	return <details className="customer-portal-member-role-editor">
		<summary>مدیریت نقش‌ها</summary>
		<div className="customer-portal-member-role-options">
			{roles.map(role => <label key={role.name}><input type="checkbox" checked={selected.includes(role.name)} onChange={event => setSelected(previous => event.target.checked ? [...previous, role.name] : previous.filter(name => name !== role.name))} /><span>{roleTitle(role)}</span></label>)}
		</div>
		<button type="button" className="customer-portal-secondary-button" disabled={busy || !changed} onClick={() => onSave(selected)}>{busy ? 'در حال ذخیره…' : 'ذخیرهٔ نقش‌ها'}</button>
	</details>;
}

function roleTitle(role: { title: string; admin_access: boolean; allow_apps?: boolean; allow_billing?: boolean }) {
	const permissions = [role.admin_access ? 'مدیر' : '', role.allow_apps ? 'دسترسی افزونه‌ها' : '', role.allow_billing ? 'مدیریت مالی' : ''].filter(Boolean);
	return permissions.length ? `${role.title} · ${permissions.join('، ')}` : role.title;
}

function messageOf(error: unknown) {
	return error instanceof Error ? error.message : 'مدیریت اعضای تیم ممکن نشد.';
}
