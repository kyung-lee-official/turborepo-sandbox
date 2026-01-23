# PayPal Order API V2

## API-Only Payment Flow

1.  **Frontend: Initiate Order**

    The user clicks a "Pay with PayPal" button on your Next.js client component.

    The frontend makes a `POST` request to your custom backend API route, for example, `/api/paypal/create-order`.

1.  **Backend: Create PayPal Order**

    The `/api/paypal/create-order` route performs the following steps **securely on the server**:

    -   Get Access Token: Use your stored Client ID and Client Secret to call the PayPal Generate Access Token API.

    -   Create Order: Call the PayPal Create Order API using the generated Access Token.
        
		```
		POST https://api-m.paypal.com/v2/checkout/orders
		```

    -   Return Response: Return the PayPal-generated `orderID` and the relevant PayPal `approve` link (from the `links` array in the response) back to the frontend. Example

    ```json
    "links": [
        {
            "href": "https://api.sandbox.paypal.com/v2/checkout/orders/7HK8382586641930H",
            "rel": "self",
            "method": "GET"
        },
        {
            "href": "https://www.sandbox.paypal.com/checkoutnow?token=7HK8382586641930H",
            "rel": "payer-action",
            "method": "GET"
        }
    ]
    ```

    Here the `self` link is used by the backend to retrieve order details if needed, and the `payer-action` link is used to redirect the user for approval.

	The `/api/paypal/create-order` route responds with the `orderID` and the `approve` link to the frontend.

2.  Frontend: User Approval (Redirection)

    The frontend receives the `approve` link, automatically (onSuccess) redirects the user to the PayPal `approve` link. This is where the user logs into PayPal and authorizes the payment.

    After approval (or cancellation), PayPal redirects the user back to your site using the `return_url` (or `cancel_url`) you specified in the Create Order API call. On page `return_url` (e.g. `/checkout/success?token=...&PayerID=...`), poll requests (or SSE) to your backend to check the payment status, let the user wait for the final confirmation.

3.  Backend: Authorize/Capture Payment

	For security reasons, the payment flow is designed to be 'two-legged' to prevent fraudulent activities. It requires a server-side call to ensure the request comes from a trusted source (your backend, authenticated with your API keys).

	After the user approves the payment on PayPal's site, PayPal sends webhook events to your backend. 

	There are two different webhook routines depending on the payment intent `AUTHORIZE` or `CAPTURE`.

	`AUTHORIZE`

	* `CHECKOUT.ORDER.APPROVED`, which indicates that the user has approved the PayPal order and the payment can now be authorized.

    	Upon receiving this webhook event, your backend can call the PayPal Authorize API to authorize the payment.
		
		```
		POST https://api-m.paypal.com/v2/checkout/orders/{order_id}/authorize
		```

		PayPal returns an authorization ID in the response. This authorization ID can then be used to capture the funds by calling the PayPal Capture API later. Once the payment is authorized, PayPal sends a `PAYMENT.AUTHORIZATION.CREATED` webhook event to notify your backend that the authorization was successful.
	
	* `PAYMENT.AUTHORIZATION.CREATED`, which indicates that the payment authorization was successfully created. Your backend can now capture the funds using the authorization ID by calling the PayPal Capture API.
		
		```
		POST https://api-m.paypal.com/v2/payments/authorizations/{authorization_id}/capture
		```

		Once the funds are captured, PayPal sends a `PAYMENT.CAPTURE.COMPLETED` webhook event to notify your backend that the payment has been successfully captured.

	* `PAYMENT.CAPTURE.COMPLETED`, which indicates that the payment has been successfully captured, the funds have been transferred to the merchant's account. Your backend can now update the order status to "COMPLETED" and fulfill the order accordingly.
  
	`CAPTURE`

	* `CHECKOUT.ORDER.APPROVED`, which indicates that the user has approved the PayPal order and the payment can now be captured.

		Upon receiving this webhook event, your backend can call the PayPal Capture API to capture the payment.
		
		```
		POST https://api-m.paypal.com/v2/checkout/orders/{order_id}/capture
		```

		Once the funds are captured, PayPal sends a `PAYMENT.CAPTURE.COMPLETED` webhook event to notify your backend that the payment has been successfully captured.

## PayPal AUTHORIZE vs CAPTURE

PayPal offers two different payment intents:

1. AUTHORIZE - Reserves funds but doesn't transfer them immediately
1. CAPTURE - Actually transfers the reserved funds to the merchant

The Two-Step Process:

Step 1: AUTHORIZE

-   The customer approves the payment on PayPal's site.
-   PayPal reserves the funds but does not transfer them yet.
-   Money is held for a limited time (usually 29 days).
-   The order status becomes "APPROVED".

Step 2: CAPTURE

-   The merchant decides when to capture the funds.
-   PayPal transfers the reserved funds to the merchant's account.
-   The order status becomes "COMPLETED".


Business Use Cases:

AUTHORIZE Intent is useful for:

-   Pre-orders - Reserving funds for items not yet available
-   Custom/Made-to-order products - Ensure payment before manufacturing
-   Physical goods - Capture funds after shipping to avoid fraud
-   Services - Capture when service is delivered
-   Fraud prevention - Time to verify orders before capturing funds

**⚠️ Important Note for AUTHORIZE Intent:**
When capturing an order created with `AUTHORIZE` intent, you must follow a **two-step API process**:

1. **First**: Call the authorize endpoint to authorize the approved payment
    ```
    POST /v2/checkout/orders/{order_id}/authorize
    ```
2. **Second**: Use the returned authorization ID to capture the funds
    ```
    POST /v2/payments/authorizations/{authorization_id}/capture
    ```

You **cannot** directly call `/v2/checkout/orders/{order_id}/capture` on an AUTHORIZE intent order, as this will result in an `ACTION_DOES_NOT_MATCH_INTENT` error.

Direct CAPTURE Intent (single step) is suitable for:

-   Digital goods - Immediate delivery after payment
-   Subscriptions - Regular, automated billing
-   Simple purchases - Low-risk transactions with instant fulfillment
