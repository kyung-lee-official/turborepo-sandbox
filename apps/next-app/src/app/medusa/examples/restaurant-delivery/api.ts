import http from "../../axios-error-handling-for-medusa/axios-client";

export const QK = {
  LIST_RESTAURANTS: "list-restaurants",
};

export const listRestaurants = async () => {
  return http.get<unknown>("/restaurants");
};

// export const listRestaurants = async () => {
// 	const res = await axios.get(
// 		"/api/medusa/examples/restaurant-delivery/restaurants",
// 		{
// 			headers: {
// 				"x-publishable-api-key":
// 					process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
// 			},
// 		}
// 	);
// 	return res.data;
// };

export const createRestaurant = async (data: {
  name: string;
  handle: string;
  address: string;
  phone: string;
  email: string;
}) => {
  return http.post<unknown>("/restaurants", data);
};
