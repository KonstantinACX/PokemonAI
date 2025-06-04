const authConfig = {
  providers: [
    {
      // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      domain:
        "CLERK_JWT_ISSUER_DOMAIN" in process.env
          ? process.env.CLERK_JWT_ISSUER_DOMAIN
          : "https://workable-dog-93.clerk.accounts.dev", // Use same domain for both dev and prod
      applicationID: "convex",
    },
  ],
};

export default authConfig;
