name: 🐛 Bug Report
description: Something is wrong with Hydrogen.
labels:
  - "bug:unverified"
body:
  - type: markdown
    attributes:
      value: |
        Thank you for helping to improve Hydrogen!

        ## The best bug report is a failing test!

        The fastest way to get a bug fixed is to provide an example repository that reproduces the problem.
        
  - type: input
    attributes:
      label: What is the location of your example repository?
    validations:
      required: false
  - type: input
    attributes:
      label: What version of Hydrogen are you using?
    validations:
      required: true
  - type: input
    attributes:
      label: What version of Remix are you using?
    validations:
      required: false
  - type: checkboxes
    attributes:
      label: Are all your Hydrogen dependencies & dev-dependencies using the same version?
      options:
        - label: "Yes"
          required: true
  - type: textarea
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior.
    validations:
      required: true
  - type: textarea
    attributes:
      label: Expected Behavior
      description: A concise description of what you expected to happen.
    validations:
      required: true
  - type: textarea
    attributes:
      label: Actual Behavior
      description: A concise description of what you're experiencing.
    validations:
      required: true
