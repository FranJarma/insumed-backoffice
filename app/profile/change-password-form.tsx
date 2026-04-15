"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/features/auth/actions";
import { changePasswordSchema, type ChangePasswordInput } from "@/features/auth/types";

export function ChangePasswordForm() {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
  });

  async function onSubmit(data: ChangePasswordInput) {
    setSuccess(false);
    const result = await changePassword(data);
    if (result?.error) {
      const fieldErrors = result.error as Record<string, string[]>;
      for (const [field, messages] of Object.entries(fieldErrors)) {
        setError(field as keyof ChangePasswordInput, {
          message: messages[0],
        });
      }
      return;
    }
    if (result?.success) {
      setSuccess(true);
      reset();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Contraseña actual <span className="text-destructive">*</span></Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
        {errors.currentPassword && (
          <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva contraseña <span className="text-destructive">*</span></Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña <span className="text-destructive">*</span></Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {success && (
        <p className="text-sm font-medium text-green-600">
          Contraseña actualizada correctamente.
        </p>
      )}

      <Button type="submit" disabled={isSubmitting || !isValid}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          "Cambiar contraseña"
        )}
      </Button>
    </form>
  );
}
