// import { DevTool } from "@hookform/devtools";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FetcherError, post } from "@/lib/fetcher";
import { Debug } from "./Debug";
import { Input } from "./Input";

const signIn = async (body: {
  email: string;
  password: string;
}): Promise<any> => {
  return post<any>("/api/form-and-input", body);
};

const schema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Required" }),
  confirmPassword: z.string().min(1, { message: "Required" }),
});
export type FormInput = z.infer<typeof schema>;

export const Form = () => {
  const [oldData, setOldData] = useState<FormInput>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [newData, setNewData] = useState<FormInput>(oldData);
  const [email, setEmail] = useState(oldData.email);
  const [password, setPassword] = useState(oldData.password);
  const [confirmPassword, setConfirmPassword] = useState(
    oldData.confirmPassword,
  );
  const [isPasswordMatch, setIsPasswordMatch] = useState(true);
  const [isConfirmPasswordBlur, setIsConfirmPasswordBlur] = useState(false);

  useEffect(() => {
    setNewData({ email, password, confirmPassword });
    if (isConfirmPasswordBlur) {
      if (password !== confirmPassword) {
        setIsPasswordMatch(false);
      } else {
        setIsPasswordMatch(true);
      }
    }
  }, [email, password, confirmPassword, isConfirmPasswordBlur]);

  const { register, formState, control } = useForm<FormInput>({
    /**
     * onChange only tracks independent fields,
     * which means when an error is reported on a field, it will not be removed
     * if you change another field to make the error condition go away.
     *
     * for example, if an error is reported in confirmPassword,
     * and you try to change the password field to make the error go away,
     * the error will still be there.
     *
     * therefore you can either using useEffect (recommended) or `watch` to track the changes
     */
    mode: "onChange",
    resolver: zodResolver(schema) as any,
  });

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
        <Input
          type="password"
          title={"Password"}
          isError={!!formState.errors.password || !isPasswordMatch}
          isRequired={true}
          placeholder="Password"
          disabled={mutation.isPending}
          errorMessage={
            formState.errors.password?.message ||
            (isPasswordMatch ? undefined : "Password does not match")
          }
          {...register("password", {
            onChange: (e) => {
              setPassword(e.target.value);
            },
          })}
        />
        <Input
          type="password"
          title={"Confirm Password"}
          isError={!!formState.errors.confirmPassword}
          isRequired={true}
          placeholder="Confirm Password"
          disabled={mutation.isPending}
          errorMessage={formState.errors.confirmPassword?.message}
          {...register("confirmPassword", {
            onChange: (e) => {
              setConfirmPassword(e.target.value);
            },
            onBlur: () => {
              setIsConfirmPasswordBlur(true);
            },
          })}
        />
        {mutation.isError &&
          mutation.error instanceof FetcherError &&
          mutation.error.status === 401 && (
            <div className="font-bold text-base text-red-400">
              Email or password is incorrect
            </div>
          )}
        <button
          type="submit"
          className="bg-blue-500 p-1 text-sm text-white"
          onClick={(e) => {
            e.preventDefault();
            mutation.mutate(newData);
          }}
        >
          Sign In
        </button>
      </form>
      <Debug
        data={newData}
        formState={formState}
        isPasswordMatch={isPasswordMatch}
        isConfirmPasswordBlur={isConfirmPasswordBlur}
      />
      {/**
       * set up the dev tool
       * DevTool could cause server-client render mismatch
       */}
      {/* <DevTool control={control} /> */}
    </div>
  );
};
