We have finalized trusTmart's direction as a *permissioned blockchain-based platform*

For your module, please follow these points:

1. Keep multiple evidence records per seller, following Avika's database contract.
2. Maintain trust score, status and explanation as separate assessment records.
3. Your service should return the assessment through its API. The main backend will handle PostgreSQL storage and blockchain transactions.
4. Important verification results and evidence hashes will be recorded on the blockchain.
5. Both MCA and FSSAI checks are required according to the seller category. Manual reviewer-based verification is acceptable for our current prototype.

Please finalize your API response structure and share it with Avika and me before integration. Don't make your service directly dependent on PostgreSQL or independently write blockchain transactions.