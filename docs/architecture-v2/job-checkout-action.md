# Job Checkout Action

Helper that provides a repo's clone.

- endpoint url of the "Checkout Service", the "provider"
- where to extract the archive, "destination"

## Flow
- need to know if a job needs the checkout action
- compile the CHECKOUT_SERVICE_URL
- inject the variable to docker
- runner creates the CheckoutAction instance
- the job calls the `checkout()` on the action
- exec the commands inside the container
