document.addEventListener("DOMContentLoaded", () => {
    // State management
    const state = {
      services: {
        trash: { enabled: false, day: "", frequency: "", cans: 1 },
        recycling: { enabled: false, day: "", frequency: "", cans: 1 },
        compost: { enabled: false, day: "", frequency: "", cans: 1 },
      },
      startDate: null,
      BASE_FEE: 29,
    }
  
    // Price calculation
    function calculatePrice(config, serviceId) {
      if (!config.enabled || !config.day || !config.frequency) return 0
  
      const basePrice = {
        weekly: 10,
        biweekly: 5,
        monthly: 2.5,
      }
  
      // Check if this service shares its collection day with any other enabled service
      const hasSameDayService = Object.entries(state.services).some(([id, otherConfig]) => {
        if (id === serviceId || !otherConfig.enabled || !otherConfig.day) return false
        return config.day === otherConfig.day
      })
  
      const pricePerCan = hasSameDayService ? basePrice[config.frequency] : basePrice[config.frequency] * 2
  
      return pricePerCan * config.cans
    }
  
    function updateTotalPrice() {
      const total = Object.entries(state.services).reduce(
        (sum, [serviceId, config]) => sum + calculatePrice(config, serviceId),
        state.BASE_FEE,
      )
  
      // Update price display
      document.getElementById("total-price").textContent = `$${total}/mo`
  
      // Update service prices
      const servicePricesContainer = document.getElementById("service-prices")
      servicePricesContainer.innerHTML = ""
  
      Object.entries(state.services).forEach(([serviceId, config]) => {
        if (config.enabled) {
          const price = calculatePrice(config, serviceId)
          const hasSameDayService = Object.entries(state.services).some(([id, otherConfig]) => {
            if (id === serviceId || !otherConfig.enabled || !otherConfig.day) return false
            return config.day === otherConfig.day
          })
  
          const div = document.createElement("div")
          div.className = "price-row"
          div.innerHTML = `
                      <span class="price-label">
                          ${serviceId.charAt(0).toUpperCase() + serviceId.slice(1)} Service 
                          (${config.cans} can${config.cans > 1 ? "s" : ""}, 
                          ${hasSameDayService ? "Same-Day" : "Solo Day"})
                      </span>
                      <span class="price-value">$${price}/mo</span>
                  `
          servicePricesContainer.appendChild(div)
        }
      })
    }
  
    // Service checkbox handlers
    document.querySelectorAll(".service-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const serviceId = e.target.closest(".service-item").dataset.service
        state.services[serviceId].enabled = e.target.checked
  
        // Toggle service details visibility
        const details = e.target.closest(".service-item").querySelector(".service-details")
        details.classList.toggle("hidden", !e.target.checked)
  
        updateTotalPrice()
      })
    })
  
    // Custom select handlers
    document.querySelectorAll(".select-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const dropdown = e.target.nextElementSibling
        dropdown.classList.toggle("hidden")
  
        // Close other dropdowns
        document.querySelectorAll(".select-dropdown").forEach((d) => {
          if (d !== dropdown) d.classList.add("hidden")
        })
      })
    })
  
    document.querySelectorAll(".select-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        const serviceItem = e.target.closest(".service-item")
        const serviceId = serviceItem.dataset.service
        const selectButton = e.target.closest(".custom-select").querySelector(".select-button")
        const isFrequency = selectButton.textContent.includes("frequency")
  
        selectButton.textContent = e.target.textContent
        e.target.closest(".select-dropdown").classList.add("hidden")
  
        // Update state
        if (isFrequency) {
          state.services[serviceId].frequency = e.target.dataset.value
        } else {
          state.services[serviceId].day = e.target.dataset.value
        }
  
        updateTotalPrice()
      })
    })
  
    // Number stepper handlers
    document.querySelectorAll(".stepper-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const serviceId = e.target.closest(".service-item").dataset.service
        const isPlus = button.classList.contains("plus")
        const valueDisplay = button.parentElement.querySelector(".stepper-value")
        const minusButton = button.parentElement.querySelector(".minus")
  
        if (isPlus) {
          state.services[serviceId].cans++
          valueDisplay.textContent = state.services[serviceId].cans
          minusButton.disabled = false
        } else {
          state.services[serviceId].cans = Math.max(1, state.services[serviceId].cans - 1)
          valueDisplay.textContent = state.services[serviceId].cans
          minusButton.disabled = state.services[serviceId].cans === 1
        }
  
        updateTotalPrice()
      })
    })
  
    // Calendar functionality
    const datePickerButton = document.querySelector(".date-picker-button")
    const calendarPopup = document.querySelector(".calendar-popup")
    const calendar = document.querySelector(".calendar")
  
    function createCalendar() {
      const today = new Date()
      const nextMonday = new Date()
      nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7))
  
      const currentMonth = new Date(nextMonday)
      currentMonth.setDate(1)
  
      const calendarHTML = `
              <div class="calendar-header">
                  <button class="prev-month">&lt;</button>
                  <span>${currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}</span>
                  <button class="next-month">&gt;</button>
              </div>
              <div class="calendar-days">
                  ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                    .map((day) => `<div class="calendar-day-header">${day}</div>`)
                    .join("")}
              </div>
          `
  
      calendar.innerHTML = calendarHTML
  
      const daysGrid = document.createElement("div")
      daysGrid.className = "calendar"
  
      const firstDay = currentMonth.getDay()
      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  
      // Add empty cells for days before the first of the month
      for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement("div")
        emptyDay.className = "calendar-day"
        daysGrid.appendChild(emptyDay)
      }
  
      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement("div")
        dayElement.className = "calendar-day"
        dayElement.textContent = day
  
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
  
        // Only enable Mondays that are after next Monday
        if (date.getDay() === 1 && date >= nextMonday) {
          dayElement.addEventListener("click", () => {
            state.startDate = date
            datePickerButton.querySelector(".date-display").textContent = date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
            calendarPopup.classList.add("hidden")
            document.getElementById("signupButton").disabled = false
          })
        } else {
          dayElement.classList.add("disabled")
        }
  
        if (state.startDate && date.getTime() === state.startDate.getTime()) {
          dayElement.classList.add("selected")
        }
  
        daysGrid.appendChild(dayElement)
      }
  
      calendar.appendChild(daysGrid)
    }
  
    datePickerButton.addEventListener("click", () => {
      calendarPopup.classList.toggle("hidden")
      createCalendar()
    })
  
    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".custom-select")) {
        document.querySelectorAll(".select-dropdown").forEach((dropdown) => {
          dropdown.classList.add("hidden")
        })
      }
  
      if (!e.target.closest(".date-picker")) {
        calendarPopup.classList.add("hidden")
      }
    })
  
    // Initialize price display
    updateTotalPrice()
  })
  
  