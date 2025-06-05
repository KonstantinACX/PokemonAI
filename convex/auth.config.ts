const authConfig = {
  providers: [
    {
      // See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
      domain: "https://workable-dog-93.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
