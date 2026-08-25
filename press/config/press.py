from frappe import _


def _dt(name: str) -> dict:
	return {"type": "doctype", "name": name}


def _report(name: str, doctype: str) -> dict:
	return {"type": "report", "name": name, "doctype": doctype}


def get_data():
	return [
		{
			"label": _("Core Platform"),
			"items": [
				_dt("Site"),
				_dt("App"),
				_dt("Server"),
				_dt("Bench"),
				_dt("Cluster"),
				_dt("Cloud Provider"),
				_dt("Cloud Region"),
				_dt("Press Settings"),
			],
		},
		{
			"label": _("Site Management"),
			"items": [
				_dt("Site App"),
				_dt("Site Domain"),
				_dt("Site Config"),
				_dt("Site Backup"),
				_dt("Site Usage"),
				_dt("Site Migration"),
				_report("Press Endpoints Audit", "Site"),
			],
		},
		{
			"label": _("App Lifecycle & Deploy"),
			"items": [
				_dt("App Source"),
				_dt("App Release"),
				_dt("Release Group"),
				_dt("Deploy Candidate"),
				_dt("Deploy"),
				_dt("Release Pipeline"),
			],
		},
		{
			"label": _("Infrastructure"),
			"items": [
				_dt("Virtual Machine"),
				_dt("Proxy Server"),
				_dt("Database Server"),
				_dt("NAT Server"),
				_dt("Root Domain"),
				_report("AWS Instance Pricing", "Cluster"),
				_report("AWS Rightsizing Recommendation", "Virtual Machine"),
				_report("Server Stats", "Server"),
				_report("Shared App Server Stats", "Server"),
			],
		},
		{
			"label": _("Bench & Runtime"),
			"items": [
				_dt("Bench Update"),
				_dt("Bench Dependency"),
				_dt("Bench Shell"),
				_dt("Bench Get App Cache"),
				_report("Bench Memory Limits", "Bench"),
			],
		},
		{
			"label": _("Database & Observability"),
			"items": [
				_dt("MariaDB Variable"),
				_dt("MariaDB Upgrade"),
				_dt("Log Server"),
				_dt("Incident"),
				_dt("Prometheus Alert Rule"),
				_report("Binary Log Browser", "Site"),
				_report("MariaDB Deadlock Browser", "Site"),
				_report("MariaDB Locks List", "Site"),
				_report("MariaDB Process List", "Site"),
				_report("MariaDB Slow Queries", "Site"),
			],
		},
		{
			"label": _("Security & Access"),
			"items": [
				_dt("TLS Certificate"),
				_dt("SSH Certificate"),
				_dt("User SSH Key"),
				_dt("User 2FA"),
				_dt("Security Update"),
			],
		},
		{
			"label": _("Users & Permissions"),
			"items": [
				_dt("Team"),
				_dt("Team Member"),
				_dt("Press Role"),
				_dt("Press Role Permission"),
				_dt("Account Request"),
				_dt("Support Access"),
			],
		},
		{
			"label": _("Billing & Payments"),
			"items": [
				_dt("Subscription"),
				_dt("Usage Record"),
				_dt("Invoice"),
				_dt("Invoice Item"),
				_dt("Payment Gateway"),
				_dt("Stripe Payment Event"),
				_dt("Razorpay Payment Record"),
				_dt("Mpesa Payment Record"),
				_report("Payment Partner", "Payment Partner Transaction"),
			],
		},
		{
			"label": _("Marketplace & Integrations"),
			"items": [
				_dt("Marketplace App"),
				_dt("Marketplace App Version"),
				_dt("Marketplace App Category"),
				_dt("Press Webhook"),
				_dt("Press Webhook Log"),
				_dt("GitHub Webhook Log"),
				_report("Marketplace App Repository Visibility", "Marketplace App"),
			],
		},
	]
