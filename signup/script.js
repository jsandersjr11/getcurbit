document.addEventListener("DOMContentLoaded", () => {
  // Function to handle frequency change and toggle input stepper visibility
  function handleFrequencyChange(binType) {
    const frequencySelect = document.getElementById(`${binType}-bin-frequency`);
    const container = document.getElementById(`${binType}-container`);
    const stepper = container.querySelector(`${binType}-input-stepper`);
    
    if (frequencySelect) {
      if (frequencySelect.value === 'none') {
        stepper.classList.add('hidden');
      } else {
        stepper.classList.remove('hidden');
      }
    }
  }

  // Add event listeners for frequency changes
  ['trash', 'recycling', 'compost'].forEach(binType => {
    const frequencySelect = document.getElementById(`${binType}-bin-frequency`);
    if (frequencySelect) {
      frequencySelect.addEventListener('change', () => handleFrequencyChange(binType));
      // Initialize visibility state
      handleFrequencyChange(binType);
    }
  });

  const addressForm = document.getElementById("address-form")
  const addressCheck = document.getElementById("address-check")
  const serviceInfoSection = document.getElementById("service-info")
  const serviceForm = document.getElementById("service-form")
  const serviceAreaMessage = document.getElementById("service-area-message")
  const serviceDetails = document.getElementById("service-details")
  const serviceInfoDisplay = document.getElementById("service-info-display")
  const serviceInfoForm = document.getElementById("service-info-form")
  const editServiceInfoBtn = document.getElementById("edit-service-info")
  const cancelEditBtn = document.getElementById("cancel-edit")
  const saveChangesBtn = document.getElementById("save-changes")
  const binQuantities = document.getElementById("bin-quantities")
  const recyclingStepperContainer = document.getElementById("recycling-stepper")
  const compostStepperContainer = document.getElementById("compost-stepper")
  const totalPriceDisplay = document.getElementById("total-price")
  const reminderSection = document.getElementById("reminder-section")
  const wantRemindersCheckbox = document.getElementById("want-reminders")
  const reminderOptions = document.getElementById("reminder-options")
  const signUpRemindersBtn = document.getElementById("sign-up-reminders")
  const reminderConfirmation = document.getElementById("reminder-confirmation")
  const reminderMethodDisplay = document.getElementById("reminder-method-display")

  let isInServiceArea = false
  let serviceInfo = {
    serviceDay: "",
    trashFrequency: "",
    recyclingFrequency: "none",
    compostFrequency: "none",
  }
  const binQuantitiesData = {
    Trash: 1,
    Recycling: 0,
    Compost: 0,
  }

  const signUpButton = document.querySelector('#service-form button[type="submit"]')

  function mockCheckAddress(address) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const addressDatabase = {
          "123 Main St, Servicetown, ST 12345": {
            isInServiceArea: true,
            serviceInfo: {
              serviceDay: "Tuesday",
              trashFrequency: "Weekly",
              recyclingFrequency: "Bi-weekly",
              compostFrequency: "none",
            },
          },
          "456 Elm St, Servicetown, ST 12345": {
            isInServiceArea: true,
            serviceInfo: null,
          },
          "789 Oak St, Nearbytown, NT 67890": {
            isInServiceArea: false,
            serviceInfo: {
              serviceDay: "Wednesday",
              trashFrequency: "Weekly",
              recyclingFrequency: "Weekly",
              compostFrequency: "Weekly",
            },
          },
          "101 Pine St, Fartown, FT 13579": {
            isInServiceArea: false,
            serviceInfo: null,
          },
        }

        const result = addressDatabase[address] || {
          isInServiceArea: false,
          serviceInfo: null,
        }

        resolve(result)
      }, 1000) // Simulate a 1-second delay
    })
  }

  addressForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    const address = document.getElementById("address-input").value
    const result = await mockCheckAddress(address)
    isInServiceArea = result.isInServiceArea
    serviceInfo = result.serviceInfo || {
      serviceDay: "",
      trashFrequency: "",
      recyclingFrequency: "none",
      compostFrequency: "none",
    }
    
    // Reset form states
    serviceInfoDisplay.classList.remove("hidden")
    serviceInfoForm.classList.add("hidden")
    
    // If we don't have service info, show the form immediately
    if (!serviceInfo.serviceDay) {
      serviceInfoDisplay.classList.add("hidden")
      serviceInfoForm.classList.remove("hidden")
    }
    
    updateServiceInfoDisplay()
    addressCheck.classList.add("hidden")
    serviceInfoSection.classList.remove("hidden")
    serviceAreaMessage.textContent = isInServiceArea
      ? "Great news! We service your area. Set up your can-to-curb service below."
      : serviceInfo.serviceDay 
        ? "We don't currently service your area, but here's the nearest service schedule you can use for reminders."
        : "We don't currently service your area, but you can set up a schedule for reminders."
    serviceDetails.classList.remove("hidden")
    reminderSection.classList.remove("hidden")
    
    // Show/hide the sign-up button based on service area
    signUpButton.style.display = isInServiceArea ? "block" : "none"
    
    // Show pricing section only if in service area
    document.getElementById("pricing").style.display = isInServiceArea ? "block" : "none"
    
    // Show bin quantities only if in service area
    document.getElementById("bin-quantities").style.display = isInServiceArea ? "block" : "none"
    
    updateBinQuantities()
    calculatePrice()
  })

  function updateServiceInfoDisplay() {
    if (serviceInfo.serviceDay) {
      serviceInfoDisplay.innerHTML = `
        <p>Service Day: ${serviceInfo.serviceDay}</p>
        <p>Trash: ${serviceInfo.trashFrequency}</p>
        ${serviceInfo.recyclingFrequency !== "none" ? `<p>Recycling: ${serviceInfo.recyclingFrequency}</p>` : ""}
        ${serviceInfo.compostFrequency !== "none" ? `<p>Compost: ${serviceInfo.compostFrequency}</p>` : ""}
      `
      // Show edit button only when we have service info
      editServiceInfoBtn.classList.remove("hidden")
    } else {
      serviceInfoDisplay.innerHTML = "<p>Please set your preferred schedule for reminders.</p>"
      // Hide edit button when we're already in edit mode
      editServiceInfoBtn.classList.add("hidden")
    }
  }

  editServiceInfoBtn.addEventListener("click", () => {
    serviceInfoDisplay.classList.add("hidden")
    serviceInfoForm.classList.remove("hidden")
    document.getElementById("service-day").value = serviceInfo.serviceDay
    document.getElementById("trash-frequency").value = serviceInfo.trashFrequency
    document.getElementById("recycling-frequency").value = serviceInfo.recyclingFrequency
    document.getElementById("compost-frequency").value = serviceInfo.compostFrequency
  })

  cancelEditBtn.addEventListener("click", () => {
    serviceInfoForm.classList.add("hidden")
    serviceInfoDisplay.classList.remove("hidden")
  })

  saveChangesBtn.addEventListener("click", () => {
    serviceInfo.serviceDay = document.getElementById("service-day").value
    serviceInfo.trashFrequency = document.getElementById("trash-frequency").value
    serviceInfo.recyclingFrequency = document.getElementById("recycling-frequency").value
    serviceInfo.compostFrequency = document.getElementById("compost-frequency").value
    updateServiceInfoDisplay()
    serviceInfoForm.classList.add("hidden")
    serviceInfoDisplay.classList.remove("hidden")
    updateBinQuantities()
    calculatePrice()
  })

  function updateBinQuantities() {
    recyclingStepperContainer.classList.toggle("hidden", serviceInfo.recyclingFrequency === "none")
    compostStepperContainer.classList.toggle("hidden", serviceInfo.compostFrequency === "none")
  }

  binQuantities.addEventListener("click", (e) => {
    if (e.target.classList.contains("increment") || e.target.classList.contains("decrement")) {
      const input = e.target.parentElement.querySelector("input")
      const binType = input.id.split("-")[0]
      let value = Number.parseInt(input.value)

      if (e.target.classList.contains("increment") && value < 5) {
        value++
      } else if (e.target.classList.contains("decrement") && value > (binType === "Trash" ? 1 : 0)) {
        value--
      }

      input.value = value
      binQuantitiesData[binType] = value
      calculatePrice()
    }
  })

  function calculatePrice() {
    if (!serviceInfo.trashFrequency) return

    const frequencyMultiplier =
      serviceInfo.trashFrequency === "Weekly" ? 1 : serviceInfo.trashFrequency === "Bi-weekly" ? 0.5 : 0.25 // Monthly

    const totalCans = Object.values(binQuantitiesData).reduce((sum, quantity) => sum + quantity, 0)

    const basePrice = 39 * frequencyMultiplier
    const additionalCansPrice = Math.max(0, totalCans - 1) * 10 * frequencyMultiplier

    const totalPrice = basePrice + additionalCansPrice
    totalPriceDisplay.textContent = `Monthly Price: $${totalPrice.toFixed(2)}`
  }

  wantRemindersCheckbox.addEventListener("change", () => {
    reminderOptions.classList.toggle("hidden", !wantRemindersCheckbox.checked)
  })

  document.querySelectorAll('input[name="reminder-method"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const contactInfoLabel = document.querySelector('label[for="contact-info"]')
      contactInfoLabel.textContent = e.target.value === "sms" ? "Phone Number" : "Email Address"
      document.getElementById("contact-info").type = e.target.value === "sms" ? "tel" : "email"
    })
  })

  signUpRemindersBtn.addEventListener("click", () => {
    const reminderMethod = document.querySelector('input[name="reminder-method"]:checked').value
    reminderMethodDisplay.textContent = reminderMethod.toUpperCase()
    reminderOptions.classList.add("hidden")
    reminderConfirmation.classList.remove("hidden")
  })

  serviceForm.addEventListener("submit", (e) => {
    e.preventDefault()
    console.log("Form submitted", {
      address: document.getElementById("address-input").value,
      isInServiceArea,
      serviceInfo,
      wantReminders: wantRemindersCheckbox.checked,
      reminderMethod: document.querySelector('input[name="reminder-method"]:checked').value,
      contactInfo: document.getElementById("contact-info").value,
      binQuantities: binQuantitiesData,
      totalPrice: Number.parseFloat(totalPriceDisplay.textContent.split("$")[1]),
    })
    alert("Form submitted successfully!")
  })

  const checkAnotherAddressBtn = document.getElementById("check-another-address")
  checkAnotherAddressBtn.addEventListener("click", () => {
    addressCheck.classList.remove("hidden")
    serviceInfoSection.classList.add("hidden")
    serviceInfoDisplay.classList.remove("hidden")
    serviceInfoForm.classList.add("hidden")
    document.getElementById("address-input").value = ""
    serviceForm.reset()
    isInServiceArea = false
    serviceInfo = {
      serviceDay: "",
      trashFrequency: "",
      recyclingFrequency: "none",
      compostFrequency: "none",
    }
    binQuantitiesData.Trash = 1
    binQuantitiesData.Recycling = 0
    binQuantitiesData.Compost = 0
    wantRemindersCheckbox.checked = false
    reminderOptions.classList.add("hidden")
    reminderConfirmation.classList.add("hidden")
    
    // Reset visibility of sections
    signUpButton.style.display = "block"
    document.getElementById("pricing").style.display = "block"
    document.getElementById("bin-quantities").style.display = "block"
  })
})
