"use client";

import { useQuery } from "@tanstack/react-query";
import http from "@/app/medusa/axios-error-handling-for-medusa/axios-client";

const fetchHelloWorld = async () => {
  return http.get<{ message: string }>("/hello-world");
};

export const Content = () => {
  const hwQuery = useQuery({
    queryKey: ["hello-world"],
    queryFn: fetchHelloWorld,
  });

  if (hwQuery.isLoading) {
    return <div>Loading...</div>;
  }

  if (hwQuery.error) {
    return <div>Error: {hwQuery.error.message}</div>;
  }

  console.log(hwQuery.data);

  return <div className="m-4">{hwQuery.data?.message}</div>;
};
