# Play-Cricket club key

SHIFTUP does not have an ECB API partnership. Each club asks the ECB for its own Play-Cricket site ID and API key, then enters that key in SHIFTUP. The key is stored encrypted for that club only. It is never shown again, never written to logs, and never used for another club.

The Play-Cricket API is not real-time and has no statistics endpoints. SHIFTUP reads fixtures and results overnight, and pulls a scorecard after a match has a result. It keeps a local cache and uses a short date window so it does not request a club's whole history on every run.

Official note: [Do you have an API to access Play-Cricket data?](https://play-cricket.ecb.co.uk/hc/en-us/articles/115004270145)

## Ask the ECB for a key

A main admin or committee member of the club emails **play.cricket@ecb.co.uk** and asks for an API key for that club's own site. Include:

- the club name, as it appears on Play-Cricket
- the Play-Cricket site URL
- the sender's name and role at the club (main admin or committee member)
- the purpose: so the club can copy its own fixtures, results and scorecard names into its SHIFTUP account

The ECB may ask the club to sign an agreement. SHIFTUP cannot request this key on the club's behalf.

## Store it

1. Open Club settings in SHIFTUP. Only a club admin can do this.
2. Enter the numeric site ID and the API key.
3. Save. The key is encrypted with `PLAYCRICKET_KEY_SECRET` and kept on the server. The settings screen shows the site ID and the last sync time, not the key.

Sync stays off until `NEXT_PUBLIC_PLAYCRICKET_SYNC_ENABLED` is exactly `true`. The daily jobs also need `CRON_SECRET`.

Player names on a scorecard are not linked to SHIFTUP accounts by themselves. A club admin links a name to a member. A junior account, or an account with no date of birth, is not shown to other people through that link. A date of birth is never copied from Play-Cricket and never shown.

## Revoke or rotate

Disconnect in Club settings. That deletes the stored key and the cached fixtures, results, scorecard names and links for that club.

To rotate, disconnect, then connect the new key the ECB issued. The old key should also be revoked with the ECB if they provide a way to do that.

If the key is refused, the next sync stops for that club and the settings screen shows a short error that does not include the key.
