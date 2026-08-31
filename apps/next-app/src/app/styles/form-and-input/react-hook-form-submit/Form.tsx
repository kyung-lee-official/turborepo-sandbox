import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { post } from "@/lib/fetcher";
import { Input } from "./Input";

const signIn = async (body: { email: string }): Promise<any> => {
  return post<any>("/api/form-and-input", body);
};

const schema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});
type FormInput = z.infer<typeof schema>;

export const Form = () => {
  const [oldData, setOldData] = useState<FormInput>({
    email: "",
  });
  const [newData, setNewData] = useState<FormInput>(oldData);
  const [email, setEmail] = useState(oldData.email);

  useEffect(() => {
    setNewData({ email });
  }, [email]);

  const { register, handleSubmit, formState, control } = useForm<FormInput>({
    mode: "onSubmit",
    resolver: zodResolver(schema) as any,
  });

  async function onSubmit() {
    console.log("submit");
  }

  async function onError() {
    console.log("error");
  }

  const mutation = useMutation<any, Error, FormInput>({
    mutationFn: (data: FormInput) => {
      return signIn(data);
    },
  });

  return (
    <div>
      <h1 className="mb-8 text-2xl">Sign Up</h1>
      <form className="flex w-full flex-col gap-4">
        <Input
          title={"Email"}
          isError={!!formState.errors.email}
          isRequired={true}
          disabled={mutation.isPending}
          errorMessage={formState.errors.email?.message}
          {...register("email", {
            onChange: (e) => {
              setEmail(e.target.value);
            },
          })}
        />
        <button
          className="bg-blue-500 p-1 text-sm text-white"
          onClick={(e) => {
            e.preventDefault();
            handleSubmit(onSubmit, onError)();
          }}
        >
          Sign In
        </button>
      </form>
    </div>
  );
};
