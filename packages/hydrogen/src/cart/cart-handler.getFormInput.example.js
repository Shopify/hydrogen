export async function action({request, context}) {
  const formData = await request.formData();
  const cartInput = context.cart.getFormInput(formData);
}
