import { get } from "@/lib/fetcher";

export async function fetchTodo(id: number) {
  return get<unknown>(`https://jsonplaceholder.typicode.com/todos/${id}`);
}
