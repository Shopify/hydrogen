export async function action({request, context}) {
  const formData = await request.formData();
  const {action, inputs} = context.cart.getFormInput(formData);

  // Do something with the action and inputs
}
