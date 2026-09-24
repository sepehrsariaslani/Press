import frappe

from press.utils import get_current_team

from .common import (
	SUPPORT_CATEGORIES,
	SUPPORT_STATUSES,
	_require_support_agent,
	serialize_support_request,
)


@frappe.whitelist(methods=["GET"])
def support_requests():
	team = get_current_team()
	return frappe.get_all(
		"Asumi Support Request",
		filters={"team": team},
		fields=["name", "subject", "category", "status", "site", "creation", "modified"],
		order_by="modified desc",
		limit=100,
	)


@frappe.whitelist(methods=["GET"])
def support_request_detail(name: str):
	team = get_current_team()
	doc = frappe.get_doc("Asumi Support Request", name)
	if doc.team != team:
		frappe.throw("Not permitted to view this request.", frappe.PermissionError)
	return serialize_support_request(doc, include_messages=True)


@frappe.whitelist(methods=["POST"])
def create_support_request(subject: str, message: str, category: str = "Technical", site: str | None = None):
	team = get_current_team(get_doc=True)
	subject = (subject or "").strip()
	message = (message or "").strip()
	if not subject or len(subject) > 140:
		frappe.throw("Enter a subject of 1 to 140 characters.")
	if not message or len(message) > 10000:
		frappe.throw("Enter a message of 1 to 10000 characters.")
	if category not in SUPPORT_CATEGORIES:
		frappe.throw("Choose a valid request category.")
	if site and not frappe.db.exists("Site", {"name": site, "team": team.name}):
		frappe.throw("The selected site does not belong to this team.", frappe.PermissionError)

	doc = frappe.get_doc(
		{
			"doctype": "Asumi Support Request",
			"team": team.name,
			"site": site,
			"category": category,
			"subject": subject,
			"message": message,
			"requested_by": frappe.session.user,
			"status": "Open",
		}
	).insert(ignore_permissions=True)
	return serialize_support_request(doc)


@frappe.whitelist(methods=["POST"])
def reply_support_request(name: str, message: str):
	team = get_current_team()
	doc = frappe.get_doc("Asumi Support Request", name)
	if doc.team != team:
		frappe.throw("Not permitted to update this request.", frappe.PermissionError)
	message = (message or "").strip()
	if not message or len(message) > 10000:
		frappe.throw("Enter a message of 1 to 10000 characters.")
	if doc.status in {"Resolved", "Closed"}:
		frappe.throw("This request is closed. Create a new request if you need more help.")
	doc.add_comment("Comment", message)
	if doc.status == "Waiting on Customer":
		doc.status = "Open"
		doc.save(ignore_permissions=True)
	return serialize_support_request(doc, include_messages=True)


@frappe.whitelist(methods=["GET"])
def admin_support_requests():
	_require_support_agent()
	requests = frappe.get_all(
		"Asumi Support Request",
		fields=["name", "team", "site", "subject", "category", "message", "status", "resolution", "creation", "modified"],
		order_by="modified desc",
		limit=200,
	)
	if not requests:
		return []
	comments = frappe.get_all(
		"Comment",
		filters={
			"reference_doctype": "Asumi Support Request",
			"reference_name": ("in", [request.name for request in requests]),
			"comment_type": "Comment",
		},
		fields=["name", "reference_name", "comment_by", "content", "creation"],
		order_by="creation asc",
	)
	messages_by_request = {}
	for comment in comments:
		messages_by_request.setdefault(comment.reference_name, []).append(
			{
				"name": comment.name,
				"comment_by": comment.comment_by,
				"content": comment.content,
				"creation": comment.creation,
			}
		)
	for request in requests:
		request.messages = messages_by_request.get(request.name, [])
	return requests


@frappe.whitelist(methods=["POST"])
def admin_update_support_request(name: str, status: str, response: str | None = None):
	_require_support_agent()
	if status not in SUPPORT_STATUSES:
		frappe.throw("Choose a valid request status.")
	doc = frappe.get_doc("Asumi Support Request", name)
	doc.status = status
	response = (response or "").strip()
	if response:
		if len(response) > 10000:
			frappe.throw("Response cannot exceed 10000 characters.")
		doc.add_comment("Comment", response)
	doc.save(ignore_permissions=True)
	return serialize_support_request(doc, include_messages=True)
