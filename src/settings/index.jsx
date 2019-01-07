function CGMSettings(props) {
  return (
    <Page>
      <Section
        title={<Text bold align="center">CGM Settings</Text>}>
        <TextInput settingsKey="username" title="username" label="username" placeholder="username" />
        <TextInput settingsKey="password" type="password" title="password" label="password" placeholder="password" />
      </Section>
    </Page>
  );
}

registerSettingsPage(CGMSettings);