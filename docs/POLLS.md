# Polls Format
The polls are specified as Markdown. The outermost element is a list, with each list item being a question in the poll.

The entry of a question is just the question text. If there are multiple options to choose from, they are specified in a sublist after the question. Metadata of the question can be specified as `!flag` or `!flag:value` at the end of the question.

To specify general poll flags, an "empty" question at the start can be used. They then apply to all the questions.

A question can be one of the following types:
- Poll among options
    - `!multi` to allow selecting multiple entries
- Quiz among options (a poll with one or more correct solutions)
    - Correct solution has `!x` flag or `!correct` flag
    - `!multi` to allow selecting multiple entries
    - If multiple entries are marked as correct, implicitly switched to `!multi`
- Free text question
    - Can be limited in length using `!length:<len>`
- Rating (score out of x)
    - `!rate:<x>`
- Estimate (estimate value in a range)
    - `!estimate` or `!est`
    - `!min:<l>`
    - `!max:<h>`

There are two views: a presentation view which can be shown on a beamer, and an admin view to edit the poll and view the replies in detail.

By default, the replies are hidden on the presentation view. They can be made visible by default with `!show`. With `!hide`, they can be hidden explicitly.

By default, users can not advance on their own, they always see the same page as on the presentation. With `!open`, the users can progress at their own pace to this question (i.e. they can progress from the previous question).

By default, each question appears on a separate page. A question can be joined on the same page with the previous one with `!join`. This implies `!open`.

There is a shorthand for options where the answers are yes/no. `!yn` for just the options, and `!yny` or `!ynn` to mark one of the options as the correct solution. To translate the options, specify the language afterwards, e.g. `!yn:de`.

To include an image, it needs to be hosted somewhere else.
