import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, route } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/guards";

const RegisterSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a symbol"),
  name: z.string().min(1).max(100).optional(),
});

export const POST = route(async (req: Request) => {
  const data = await parseJsonBody(req, RegisterSchema);

  const email = data.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: data.name,
        passwordHash,
      },
      select: { id: true, email: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return jsonError(409, "Email already registered");
    }
    throw err;
  }
});
