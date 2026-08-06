# Backend Alignment — Mobile App Needs


Venue part:

* Booking model and creation interface already exist. Now a query interface is needed to display "My Bookings" on the "Account" page. The sorting method can choose to use date, so as to display the upcoming/past booking in the mockup page.
* Cancel booking. The creation interface already exists, but the cancellation interface is missing. Users who book by mistake currently cannot undo it. (I think although we didn't do this part in our mockup, this is a must-have feature).
* Remove a venue from favorites. I think users also need the function to unfavorite?

Account Login part:

* Delete account. At the same time, need to cascade delete the booking and favorite records associated with this user.
* "Remember me" feature. Users currently cannot stay logged in, and JWT expires very quickly. Without a refresh token, users must log in again about every 30 minutes. **Need:** (a) The login interface, in addition to returning `access_token`, must also return `refresh_token`; (b) `POST /api/auth/refresh` receives `refresh_token` and returns a new `access_token`; (c) The `refresh_token` needs to be stored in the User model. The mobile side will automatically trigger a refresh when receiving a 401 error.
* The login/register page already has Google/Apple login buttons, but they are currently disabled. Backend needs to: receive `{ provider, id_token }` → verify with Google/Apple → find or create user (User) → return JWT. At the same time, this logic also needs to be integrated into the `POST /api/auth/register` process to support account binding.
* Some miscellaneous features: can users upload custom avatars, and retrieve passwords? I'm not quite sure how the password retrieval function can be implemented.

Generative AI:

* Since our course requires that our project must have a part about AI, if I remember correctly, we decided to use AI chat (or does this part need to consult Youssef?). If so, I think we need an AI chatbot interface.