Feature: Catalog — Product Browsing, Search & Categories

  Background:
    Given the catalog service is running and healthy
    And test product data has been seeded via API

  # ===========================================================================
  # Product Listing Scenarios
  # ===========================================================================

  Scenario: User browses product listing
    Given I am on the catalog home page
    Then I should see products displayed in a grid layout
    And each product card should show name, price, and image
    And products should be paginated with 20 items per page

  Scenario: User sorts products by price
    Given I am on the catalog home page
    When I select "Price: Low to High" from the sort dropdown
    Then products should be displayed in ascending price order
    When I select "Price: High to Low"
    Then products should be displayed in descending price order

  Scenario: User filters products by category
    Given I am on the catalog home page
    When I select category "Electronics" from the sidebar
    Then I should only see products in the "Electronics" category
    And the URL should reflect the active filter
    And the product count should update

  Scenario: User filters products by price range
    Given I am on the catalog home page
    When I set the price range slider to "$50 - $200"
    Then I should only see products within that price range
    And the result count should update dynamically

  # ===========================================================================
  # Product Detail Scenarios
  # ===========================================================================

  Scenario: User views product detail page
    Given I am on the catalog home page
    When I click on "Wireless Headphones"
    Then I should see the product detail page
    And the page should display name, description, price, and images
    And I should see the product rating and review count
    And the "Add to Cart" button should be visible

  Scenario: User views product image gallery
    Given I am on the product detail page for "Wireless Headphones"
    When I click on a thumbnail image
    Then the main image should update to show the selected image
    And I should be able to navigate through all product images

  Scenario: User reads and writes product reviews
    Given I am logged in as "testuser@example.com"
    And I am on the product detail page for "Wireless Headphones"
    When I scroll to the reviews section
    Then I should see existing reviews sorted by most recent
    When I click "Write a Review"
    And I select 4 stars
    And I enter review text "Great sound quality, comfortable fit"
    And I click "Submit Review"
    Then my review should appear in the reviews section
    And the product rating should recalculate

  # ===========================================================================
  # Search Scenarios
  # ===========================================================================

  Scenario: User searches for a product
    Given I am on any page
    When I type "headphones" in the search bar
    And I press Enter
    Then I should see search results matching "headphones"
    And the result count should be displayed
    And results should be ranked by relevance

  Scenario: Search autocomplete suggests products
    Given I am on any page
    When I type "wire" in the search bar
    Then I should see autocomplete suggestions
    And the suggestions should include "Wireless Headphones"
    When I click on "Wireless Headphones" in suggestions
    Then I should be taken to that product's detail page

  Scenario: Search returns no results gracefully
    Given I am on any page
    When I search for "xyznonexistentproduct123"
    Then I should see "No results found for 'xyznonexistentproduct123'"
    And I should see suggested categories or popular products

  # ===========================================================================
  # Category Navigation Scenarios
  # ===========================================================================

  Scenario: User navigates category tree
    Given I am on the catalog home page
    When I expand "Electronics" in the category sidebar
    Then I should see subcategories like "Audio", "Wearables", "Accessories"
    When I click "Audio"
    Then I should see only audio products
    And breadcrumbs should show "Home > Electronics > Audio"

  Scenario: Category pages show correct metadata
    Given I navigate to the "Electronics" category page
    Then the page title should include "Electronics"
    And the category description should be displayed
    And the product count for that category should be accurate
