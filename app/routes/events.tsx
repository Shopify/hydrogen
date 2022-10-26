import {
  json,
  type ActionFunction,
} from "@remix-run/oxygen";


export const action: ActionFunction = async ({ request, context }) => {
  try {
    const method = request.method;
    // TODO: get ?type
    const {payload} = await request.json()

    // console.log('/events analytics:', {payload})

    return json({
      method,
      payload
    })
  } catch (e) {
    console.log('error', e.message)
    return json(e.message)
  }
};
