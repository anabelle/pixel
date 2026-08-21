---
description: The assistant fails to explicitly acknowledge recurring model failures or provide relevant error context in its responses.
kind: claim
topics: [[technical]]
---

# model-failure-acknowledgement-required

In several interactions, the assistant triggered errors such as `model_not_supported` or incomplete outputs yet provided brief replies without indicating the failure, causing user confusion and session termination. This pattern shows a lack of robust error‑handling communication, preventing users from understanding why actions did not complete. Clear acknowledgement of systemic issues is essential for maintaining user trust and enabling troubleshooting.

## Related Claims
[[language-switching-consistency]]
