// Tiny accumulator CPU skeleton with explicit architectural registers.
module mini_cpu(input clk, input reset, input [7:0] instruction_in, output [7:0] accumulator);
  reg [7:0] pc; reg [7:0] ir; reg [7:0] acc; reg [7:0] registers [0:3];
  wire [7:0] alu_result = acc + registers[ir[1:0]];
  always @(posedge clk or posedge reset) begin
    if (reset) begin pc <= 0; ir <= 0; acc <= 0; end
    else begin ir <= instruction_in; pc <= pc + 1'b1; if (instruction_in[7:4] == 4'h1) acc <= alu_result; if (instruction_in[7:4] == 4'h2) registers[instruction_in[1:0]] <= acc; end
  end
  assign accumulator = acc;
endmodule
