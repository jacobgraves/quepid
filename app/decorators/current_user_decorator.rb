# frozen_string_literal: true

class CurrentUserDecorator
  attr_reader :company,
              :default_scorer_id,
              :first_time,
              :id,
              :num_queries,
              :permissions,
              :scorer_id,
              :email

  # rubocop:disable Metrics/MethodLength
  def initialize user = nil
    if user
      @company                  = user.company
      @first_time               = user.first_login
      @id                       = user.id
      @num_queries              = user.num_queries || 0
      @permissions              = PermissionsEvaluator.new(user).run
      @default_scorer_id        = user.default_scorer_id
      @email                    = user.email
    else
      @company                  = ''
      @first_time               = false
      @id                       = ''
      @num_queries              = 0
      @permissions              = {}
      @default_scorer_id        = ''
      @email                    = ''
    end
  end
  # rubocop:enable Metrics/MethodLength
end
