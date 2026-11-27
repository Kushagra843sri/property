# Admin guide (for the dealer)

This guide explains how to run your website day to day. You do not need any technical knowledge. (Draft: screenshots will be updated once your real content is in.)

## Signing in

1. Open your website and press **Sign in** at the top right (the same button everyone uses).
2. Type your admin **email** and **password**, then press **Sign in**. Do not use the Google button; it is not for admin accounts.
3. You go straight to the **Dashboard**. Later, the **Admin** button in the top bar takes you back to it. On the left (or the top, on a phone) are: Dashboard, Listings, Leads, Interests, Enquiries.

If you forget your password, ask your developer to reset it. Never share your password. After too many wrong tries the site makes you wait a few minutes; this protects you.

_Picture: `docs/screenshots/admin-dashboard-1280.png`_

## The dashboard

It shows, at a glance:

- **People who signed up** and **New leads** (people you have not contacted yet).
- **Interests registered**: how many times someone pressed "I am interested".
- **New enquiries** from the Contact page.
- Your most recent sign-ups and the properties getting the most interest.

Press any number to go to that list.

## Adding a property

1. Go to **Listings**, press **New listing**.
2. Fill in the form:
   - **Title**: for example "2 BHK flat near the market".
   - **Property type**: Flat, Shop, Office, PG room, Furnished room (or others).
   - **For**: Rent or Sale.
   - **BHK**: appears only for **Flat**. Choose 1, 2, 3 and so on. Other types do not have BHK.
   - **Price in rupees**: type the number only, for example `22000` or `8500000`. Choose **Per month** for rent.
   - **City** is required. **Locality** helps people find it.
   - Other details (area, floor, furnishing, amenities, description) are optional but make the listing better. Separate amenities with commas.
3. Press **Create listing**. You then land on the listing's page, where you add photos.

## Adding photos

1. On the listing's page, scroll to **Photos** and press **Add photos**.
2. Pick one or more pictures (JPG, PNG or WebP, up to 5 MB each, up to 20 per listing).
3. The **first photo is the cover** shown on the list. Use the **up and down arrows** to change the order.
4. Type a short description under each photo, for example "living room". This helps people who use screen readers and helps Google.
5. To delete a photo press **Remove**, then **Yes, remove**.

Tip: take photos in daylight, landscape (wide) orientation. Location information is automatically removed from photos for your privacy.

## Changing a property: sold, rented, hidden, featured

In **Listings** you can change these straight from the list:

- **Status**: _available_ (shown), _sold_ or _rented_ (still shown, marked clearly, no interest button), _hidden_ (not shown on the website at all, but kept so you can bring it back).
- **Featured**: tick it to show the property on the home page.

To change other details open the listing, edit, and press **Save changes**.

## Deleting a property

Open the listing, scroll to the bottom, press **Delete listing** and confirm. This removes the listing, its photos and the interest records for it, and **cannot be undone**. If you only want it off the website, set the status to **hidden** instead.

## Leads: the people who signed up

**Leads** lists everyone who created an account.

- Use the search box (name, email or phone) and the status filter.
- Press a **phone number** on your phone to call; press an **email** to write.
- **Status**: change it as you work: _new_ → _contacted_ → _interested_ → _closed_.
- Press a person's **name** to open their notes. Type a note (for example "called, wants 2 BHK on rent, budget 20k") and press **Add note**.
- A **"Withdrew consent"** tag means the person asked not to be contacted. Please respect that.

_Picture: `docs/screenshots/admin-leads-1280.png`_

## What an "interested" notification means

When a signed-in visitor presses **I am interested** on a property, you get an **email** with their name, phone, email and a link to the property. It also appears under **Interests**. It means "this person would like you to call them about this property". It is not a booking or an offer. Please call them soon: the first quick call matters.

The **Interests** page shows who liked what, and whether your email alert was sent. If it says "No, check email setup", tell your developer.

## Enquiries

Messages sent from the **Contact page** appear in **Enquiries** (you also get an email). Change the status to _contacted_ or _closed_ as you go.

## Exporting leads

On the **Dashboard** or **Leads** page press **Export CSV**. A spreadsheet file downloads that opens in Excel or Google Sheets. It includes only people who still agree to be contacted. Keep this file private; it contains personal details.

## Good habits

- Mark properties **sold** or **rented** quickly so visitors do not call about them.
- Remove test listings and the sample ones (their titles start with [SAMPLE]) before launch.
- Sign out when you use a shared computer (left menu, **Sign out**).
- Do not delete a customer's data unless they ask; they can also delete their own account.

## If something looks wrong

Write down what you pressed and what you saw (a screenshot helps) and send it to your developer. See `docs/handover.md` for contacts.
