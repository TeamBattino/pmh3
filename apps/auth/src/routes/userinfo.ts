import { Hono } from "hono";
import { findAccessToken } from "../lib/db";

export function userinfoRoutes(): Hono {
  const app = new Hono();

  app.get("/userinfo", async (c) => {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json(
        { error: "invalid_request", error_description: "Missing Bearer token" },
        401
      );
    }

    const token = authHeader.slice(7);
    const stored = await findAccessToken(token);
    if (!stored) {
      return c.json(
        { error: "invalid_token", error_description: "Token is invalid or expired" },
        401
      );
    }

    const { userInfo, roles } = stored;

    return c.json({
      sub: userInfo.sub,
      name: `${userInfo.first_name} ${userInfo.last_name}`,
      given_name: userInfo.first_name,
      family_name: userInfo.last_name,
      nickname: userInfo.nickname,
      email: userInfo.email,
      gender: userInfo.gender,
      birthdate: userInfo.birthday,
      locale: userInfo.language,
      roles,
      primary_group_id: userInfo.primary_group_id,
      kantonalverband_id: userInfo.kantonalverband_id,
    });
  });

  return app;
}
