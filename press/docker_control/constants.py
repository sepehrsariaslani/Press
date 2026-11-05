"""Fixed site scope shared by the Press control plane and its Docker agent."""

CUSTOMER_SITES = (
	"boller.ir",
	"dehati.ir",
	"denhome.ir",
	"denroom.ir",
	"veederakht.ir",
)
IMPACT_SITES = ("asumi.ir", *CUSTOMER_SITES)
